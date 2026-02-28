-- Fix invite-code rotation/removal random source for SECURITY DEFINER functions
-- that set search_path to public (where gen_random_bytes may be unavailable).

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
    v_next_code := substring(md5(gen_random_uuid()::text || clock_timestamp()::text || v_attempt::text), 1, 12);

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
    v_next_code := substring(md5(gen_random_uuid()::text || clock_timestamp()::text || v_attempt::text), 1, 12);

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
    v_next_code := substring(md5(gen_random_uuid()::text || clock_timestamp()::text || v_attempt::text), 1, 12);

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
    v_next_code := substring(md5(gen_random_uuid()::text || clock_timestamp()::text || v_attempt::text), 1, 12);

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
