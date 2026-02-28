-- Unified household management controls for Budget + Drawers

-- ---------------------------------------------------------------------------
-- Membership dedupe + constraints
-- ---------------------------------------------------------------------------

WITH ranked AS (
  SELECT
    id,
    household_id,
    row_number() OVER (
      PARTITION BY user_id
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM public.budget_household_members
), removed AS (
  DELETE FROM public.budget_household_members hm
  USING ranked r
  WHERE hm.id = r.id
    AND r.rn > 1
  RETURNING hm.household_id
)
DELETE FROM public.budget_households h
WHERE h.id IN (SELECT DISTINCT household_id FROM removed)
  AND NOT EXISTS (
    SELECT 1
    FROM public.budget_household_members hm
    WHERE hm.household_id = h.id
  );

WITH ranked AS (
  SELECT
    id,
    household_id,
    row_number() OVER (
      PARTITION BY user_id
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM public.drawers_household_members
), removed AS (
  DELETE FROM public.drawers_household_members hm
  USING ranked r
  WHERE hm.id = r.id
    AND r.rn > 1
  RETURNING hm.household_id
)
DELETE FROM public.drawers_households h
WHERE h.id IN (SELECT DISTINCT household_id FROM removed)
  AND NOT EXISTS (
    SELECT 1
    FROM public.drawers_household_members hm
    WHERE hm.household_id = h.id
  );

DELETE FROM public.budget_households h
WHERE NOT EXISTS (
  SELECT 1
  FROM public.budget_household_members hm
  WHERE hm.household_id = h.id
);

DELETE FROM public.drawers_households h
WHERE NOT EXISTS (
  SELECT 1
  FROM public.drawers_household_members hm
  WHERE hm.household_id = h.id
);

DO $$
DECLARE
  v_constraint_name text;
BEGIN
  FOR v_constraint_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.budget_household_members'::regclass
      AND contype = 'u'
      AND pg_get_constraintdef(oid) ILIKE '%partner_label%'
  LOOP
    EXECUTE format('ALTER TABLE public.budget_household_members DROP CONSTRAINT %I', v_constraint_name);
  END LOOP;
END;
$$;

ALTER TABLE public.budget_household_members
  DROP COLUMN IF EXISTS partner_label;

CREATE UNIQUE INDEX IF NOT EXISTS budget_household_members_user_id_unique_idx
  ON public.budget_household_members(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS budget_household_members_household_user_unique_idx
  ON public.budget_household_members(household_id, user_id);

CREATE INDEX IF NOT EXISTS budget_household_members_household_id_idx
  ON public.budget_household_members(household_id);

CREATE UNIQUE INDEX IF NOT EXISTS drawers_household_members_user_id_unique_idx
  ON public.drawers_household_members(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS drawers_household_members_household_user_unique_idx
  ON public.drawers_household_members(household_id, user_id);

CREATE INDEX IF NOT EXISTS drawers_household_members_household_id_idx
  ON public.drawers_household_members(household_id);

-- ---------------------------------------------------------------------------
-- Budget household RPCs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.budget_create_household_for_current_user()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_display_name text;
  v_household public.budget_households%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.budget_household_members
    WHERE user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'You already belong to a budget household';
  END IF;

  SELECT NULLIF(trim(display_name), '')
    INTO v_display_name
  FROM public.bathos_profiles
  WHERE id = v_user_id;

  IF v_display_name IS NULL THEN
    RAISE EXCEPTION 'Please set your display name before creating a household';
  END IF;

  INSERT INTO public.budget_households (name, partner_x_name, partner_y_name)
  VALUES ('My Household', v_display_name, 'Partner B')
  RETURNING * INTO v_household;

  INSERT INTO public.budget_household_members (household_id, user_id)
  VALUES (v_household.id, v_user_id);

  RETURN jsonb_build_object(
    'householdId', v_household.id,
    'householdName', v_household.name,
    'inviteCode', v_household.invite_code,
    'partnerX', v_household.partner_x_name,
    'partnerY', v_household.partner_y_name,
    'wageGapAdjustmentEnabled', v_household.wage_gap_adjustment_enabled,
    'partnerXWageCentsPerDollar', v_household.partner_x_wage_cents_per_dollar,
    'partnerYWageCentsPerDollar', v_household.partner_y_wage_cents_per_dollar,
    'displayName', v_display_name
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.budget_join_household_for_current_user(_invite_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_display_name text;
  v_normalized_code text;
  v_household_id uuid;
  v_existing_household_id uuid;
  v_member_count integer := 0;
  v_household public.budget_households%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT NULLIF(trim(display_name), '')
    INTO v_display_name
  FROM public.bathos_profiles
  WHERE id = v_user_id;

  IF v_display_name IS NULL THEN
    RAISE EXCEPTION 'Please set your display name before joining a household';
  END IF;

  v_normalized_code := lower(trim(coalesce(_invite_code, '')));

  IF v_normalized_code = '' THEN
    RAISE EXCEPTION 'Invite code is required';
  END IF;

  v_household_id := public.lookup_household_by_invite_code(v_normalized_code);

  IF v_household_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  SELECT household_id
    INTO v_existing_household_id
  FROM public.budget_household_members
  WHERE user_id = v_user_id
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_existing_household_id IS NOT NULL THEN
    IF v_existing_household_id = v_household_id THEN
      RAISE EXCEPTION 'You are already a member of this household';
    END IF;
    RAISE EXCEPTION 'You already belong to a different budget household';
  END IF;

  SELECT count(*)::integer
    INTO v_member_count
  FROM public.budget_household_members
  WHERE household_id = v_household_id;

  INSERT INTO public.budget_household_members (household_id, user_id)
  VALUES (v_household_id, v_user_id);

  IF v_member_count = 1 THEN
    UPDATE public.budget_households
    SET partner_y_name = v_display_name
    WHERE id = v_household_id
      AND partner_y_name IN ('Partner B', 'Partner Y');
  END IF;

  SELECT *
    INTO v_household
  FROM public.budget_households
  WHERE id = v_household_id;

  RETURN jsonb_build_object(
    'householdId', v_household.id,
    'householdName', v_household.name,
    'inviteCode', v_household.invite_code,
    'partnerX', v_household.partner_x_name,
    'partnerY', v_household.partner_y_name,
    'wageGapAdjustmentEnabled', v_household.wage_gap_adjustment_enabled,
    'partnerXWageCentsPerDollar', v_household.partner_x_wage_cents_per_dollar,
    'partnerYWageCentsPerDollar', v_household.partner_y_wage_cents_per_dollar,
    'displayName', v_display_name
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.budget_list_household_members(_household_id uuid)
RETURNS TABLE(
  user_id uuid,
  email text,
  display_name text,
  created_at timestamptz,
  is_self boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_household_member(v_user_id, _household_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    hm.user_id,
    u.email,
    NULLIF(trim(p.display_name), ''),
    hm.created_at,
    hm.user_id = v_user_id
  FROM public.budget_household_members hm
  LEFT JOIN auth.users u
    ON u.id = hm.user_id
  LEFT JOIN public.bathos_profiles p
    ON p.id = hm.user_id
  WHERE hm.household_id = _household_id
  ORDER BY hm.created_at ASC, hm.user_id ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.budget_rotate_household_invite_code(_household_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_household public.budget_households%ROWTYPE;
  v_next_code text;
  v_attempt integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_household_member(v_user_id, _household_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  LOOP
    v_attempt := v_attempt + 1;
    v_next_code := encode(gen_random_bytes(6), 'hex');

    BEGIN
      UPDATE public.budget_households
      SET invite_code = v_next_code
      WHERE id = _household_id
      RETURNING * INTO v_household;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF v_attempt >= 10 THEN
        RAISE EXCEPTION 'Failed to generate unique invite code';
      END IF;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'householdId', v_household.id,
    'inviteCode', v_household.invite_code
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.budget_remove_household_member(
  _household_id uuid,
  _member_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_household public.budget_households%ROWTYPE;
  v_next_code text;
  v_attempt integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _member_user_id = v_user_id THEN
    RAISE EXCEPTION 'Use leave household to remove yourself';
  END IF;

  IF NOT public.is_household_member(v_user_id, _household_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.budget_household_members
    WHERE household_id = _household_id
      AND user_id = _member_user_id
  ) THEN
    RAISE EXCEPTION 'Member not found in household';
  END IF;

  DELETE FROM public.budget_household_members
  WHERE household_id = _household_id
    AND user_id = _member_user_id;

  LOOP
    v_attempt := v_attempt + 1;
    v_next_code := encode(gen_random_bytes(6), 'hex');

    BEGIN
      UPDATE public.budget_households
      SET invite_code = v_next_code
      WHERE id = _household_id
      RETURNING * INTO v_household;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF v_attempt >= 10 THEN
        RAISE EXCEPTION 'Failed to generate unique invite code';
      END IF;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'householdId', v_household.id,
    'removedUserId', _member_user_id,
    'inviteCode', v_household.invite_code
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.budget_leave_household(_household_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_member_count integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_household_member(v_user_id, _household_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT count(*)::integer
    INTO v_member_count
  FROM public.budget_household_members
  WHERE household_id = _household_id;

  IF v_member_count <= 1 THEN
    RAISE EXCEPTION 'Cannot leave household as sole member. Delete the household instead.';
  END IF;

  DELETE FROM public.budget_household_members
  WHERE household_id = _household_id
    AND user_id = v_user_id;

  RETURN jsonb_build_object(
    'householdId', _household_id,
    'leftUserId', v_user_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.budget_delete_household(_household_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_household_member(v_user_id, _household_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  DELETE FROM public.budget_households
  WHERE id = _household_id;

  RETURN jsonb_build_object(
    'householdId', _household_id,
    'deleted', true
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Drawers household RPCs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.lookup_drawers_household_by_invite_code(_code text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF _code IS NULL OR _code !~ '^[a-f0-9]{12}$' THEN
    RETURN NULL;
  END IF;

  RETURN (
    SELECT id
    FROM public.drawers_households
    WHERE invite_code = _code
    LIMIT 1
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.drawers_create_household_for_current_user()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_display_name text;
  v_household public.drawers_households%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.drawers_household_members
    WHERE user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'You already belong to a drawers household';
  END IF;

  SELECT NULLIF(trim(display_name), '')
    INTO v_display_name
  FROM public.bathos_profiles
  WHERE id = v_user_id;

  IF v_display_name IS NULL THEN
    RAISE EXCEPTION 'Please set your display name before creating a household';
  END IF;

  INSERT INTO public.drawers_households DEFAULT VALUES
  RETURNING * INTO v_household;

  INSERT INTO public.drawers_household_members (household_id, user_id)
  VALUES (v_household.id, v_user_id);

  RETURN jsonb_build_object(
    'householdId', v_household.id,
    'householdName', v_household.name,
    'inviteCode', v_household.invite_code,
    'displayName', v_display_name
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.drawers_join_household_for_current_user(_invite_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_display_name text;
  v_normalized_code text;
  v_household_id uuid;
  v_existing_household_id uuid;
  v_household public.drawers_households%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT NULLIF(trim(display_name), '')
    INTO v_display_name
  FROM public.bathos_profiles
  WHERE id = v_user_id;

  IF v_display_name IS NULL THEN
    RAISE EXCEPTION 'Please set your display name before joining a household';
  END IF;

  v_normalized_code := lower(trim(coalesce(_invite_code, '')));

  IF v_normalized_code = '' THEN
    RAISE EXCEPTION 'Invite code is required';
  END IF;

  v_household_id := public.lookup_drawers_household_by_invite_code(v_normalized_code);

  IF v_household_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  SELECT household_id
    INTO v_existing_household_id
  FROM public.drawers_household_members
  WHERE user_id = v_user_id
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_existing_household_id IS NOT NULL THEN
    IF v_existing_household_id = v_household_id THEN
      RAISE EXCEPTION 'You are already a member of this drawers household';
    END IF;
    RAISE EXCEPTION 'You already belong to a different drawers household';
  END IF;

  INSERT INTO public.drawers_household_members (household_id, user_id)
  VALUES (v_household_id, v_user_id);

  SELECT *
    INTO v_household
  FROM public.drawers_households
  WHERE id = v_household_id;

  RETURN jsonb_build_object(
    'householdId', v_household.id,
    'householdName', v_household.name,
    'inviteCode', v_household.invite_code,
    'displayName', v_display_name
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.drawers_list_household_members(_household_id uuid)
RETURNS TABLE(
  user_id uuid,
  email text,
  display_name text,
  created_at timestamptz,
  is_self boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_drawers_household_member(v_user_id, _household_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    hm.user_id,
    u.email,
    NULLIF(trim(p.display_name), ''),
    hm.created_at,
    hm.user_id = v_user_id
  FROM public.drawers_household_members hm
  LEFT JOIN auth.users u
    ON u.id = hm.user_id
  LEFT JOIN public.bathos_profiles p
    ON p.id = hm.user_id
  WHERE hm.household_id = _household_id
  ORDER BY hm.created_at ASC, hm.user_id ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.drawers_rotate_household_invite_code(_household_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_household public.drawers_households%ROWTYPE;
  v_next_code text;
  v_attempt integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_drawers_household_member(v_user_id, _household_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  LOOP
    v_attempt := v_attempt + 1;
    v_next_code := encode(gen_random_bytes(6), 'hex');

    BEGIN
      UPDATE public.drawers_households
      SET invite_code = v_next_code
      WHERE id = _household_id
      RETURNING * INTO v_household;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF v_attempt >= 10 THEN
        RAISE EXCEPTION 'Failed to generate unique invite code';
      END IF;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'householdId', v_household.id,
    'inviteCode', v_household.invite_code
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.drawers_remove_household_member(
  _household_id uuid,
  _member_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_household public.drawers_households%ROWTYPE;
  v_next_code text;
  v_attempt integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _member_user_id = v_user_id THEN
    RAISE EXCEPTION 'Use leave household to remove yourself';
  END IF;

  IF NOT public.is_drawers_household_member(v_user_id, _household_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.drawers_household_members
    WHERE household_id = _household_id
      AND user_id = _member_user_id
  ) THEN
    RAISE EXCEPTION 'Member not found in household';
  END IF;

  DELETE FROM public.drawers_household_members
  WHERE household_id = _household_id
    AND user_id = _member_user_id;

  LOOP
    v_attempt := v_attempt + 1;
    v_next_code := encode(gen_random_bytes(6), 'hex');

    BEGIN
      UPDATE public.drawers_households
      SET invite_code = v_next_code
      WHERE id = _household_id
      RETURNING * INTO v_household;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF v_attempt >= 10 THEN
        RAISE EXCEPTION 'Failed to generate unique invite code';
      END IF;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'householdId', v_household.id,
    'removedUserId', _member_user_id,
    'inviteCode', v_household.invite_code
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.drawers_leave_household(_household_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_member_count integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_drawers_household_member(v_user_id, _household_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT count(*)::integer
    INTO v_member_count
  FROM public.drawers_household_members
  WHERE household_id = _household_id;

  IF v_member_count <= 1 THEN
    RAISE EXCEPTION 'Cannot leave household as sole member. Delete the household instead.';
  END IF;

  DELETE FROM public.drawers_household_members
  WHERE household_id = _household_id
    AND user_id = v_user_id;

  RETURN jsonb_build_object(
    'householdId', _household_id,
    'leftUserId', v_user_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.drawers_delete_household(_household_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_drawers_household_member(v_user_id, _household_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  DELETE FROM public.drawers_households
  WHERE id = _household_id;

  RETURN jsonb_build_object(
    'householdId', _household_id,
    'deleted', true
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Guardrails: households must not be stranded with zero members
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_budget_household_nonempty()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP IN ('DELETE', 'UPDATE') THEN
    IF OLD.household_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.budget_households h
        WHERE h.id = OLD.household_id
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.budget_household_members hm
        WHERE hm.household_id = OLD.household_id
      ) THEN
      RAISE EXCEPTION 'Budget households must have at least one member';
    END IF;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF NEW.household_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.budget_households h
        WHERE h.id = NEW.household_id
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.budget_household_members hm
        WHERE hm.household_id = NEW.household_id
      ) THEN
      RAISE EXCEPTION 'Budget households must have at least one member';
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS budget_household_members_nonempty_trigger ON public.budget_household_members;

CREATE CONSTRAINT TRIGGER budget_household_members_nonempty_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.budget_household_members
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.enforce_budget_household_nonempty();

CREATE OR REPLACE FUNCTION public.enforce_budget_household_row_nonempty()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.budget_households h
      WHERE h.id = NEW.id
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.budget_household_members hm
      WHERE hm.household_id = NEW.id
    ) THEN
    RAISE EXCEPTION 'Budget households must have at least one member';
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS budget_households_nonempty_trigger ON public.budget_households;

CREATE CONSTRAINT TRIGGER budget_households_nonempty_trigger
AFTER INSERT OR UPDATE ON public.budget_households
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.enforce_budget_household_row_nonempty();

CREATE OR REPLACE FUNCTION public.enforce_drawers_household_nonempty()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP IN ('DELETE', 'UPDATE') THEN
    IF OLD.household_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.drawers_households h
        WHERE h.id = OLD.household_id
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.drawers_household_members hm
        WHERE hm.household_id = OLD.household_id
      ) THEN
      RAISE EXCEPTION 'Drawers households must have at least one member';
    END IF;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF NEW.household_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.drawers_households h
        WHERE h.id = NEW.household_id
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.drawers_household_members hm
        WHERE hm.household_id = NEW.household_id
      ) THEN
      RAISE EXCEPTION 'Drawers households must have at least one member';
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS drawers_household_members_nonempty_trigger ON public.drawers_household_members;

CREATE CONSTRAINT TRIGGER drawers_household_members_nonempty_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.drawers_household_members
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.enforce_drawers_household_nonempty();

CREATE OR REPLACE FUNCTION public.enforce_drawers_household_row_nonempty()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.drawers_households h
      WHERE h.id = NEW.id
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.drawers_household_members hm
      WHERE hm.household_id = NEW.id
    ) THEN
    RAISE EXCEPTION 'Drawers households must have at least one member';
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS drawers_households_nonempty_trigger ON public.drawers_households;

CREATE CONSTRAINT TRIGGER drawers_households_nonempty_trigger
AFTER INSERT OR UPDATE ON public.drawers_households
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.enforce_drawers_household_row_nonempty();

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

GRANT EXECUTE ON FUNCTION public.budget_create_household_for_current_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.budget_join_household_for_current_user(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.budget_list_household_members(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.budget_rotate_household_invite_code(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.budget_remove_household_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.budget_leave_household(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.budget_delete_household(uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.lookup_drawers_household_by_invite_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.drawers_create_household_for_current_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.drawers_join_household_for_current_user(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.drawers_list_household_members(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.drawers_rotate_household_invite_code(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.drawers_remove_household_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.drawers_leave_household(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.drawers_delete_household(uuid) TO authenticated;
