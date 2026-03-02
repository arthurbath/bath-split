ALTER TABLE public.budget_expenses
  ADD COLUMN IF NOT EXISTS value_type text NOT NULL DEFAULT 'simple',
  ADD COLUMN IF NOT EXISTS average_records jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.budget_income_streams
  ADD COLUMN IF NOT EXISTS is_estimate boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS value_type text NOT NULL DEFAULT 'simple',
  ADD COLUMN IF NOT EXISTS average_records jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.budget_expenses
SET value_type = 'simple'
WHERE value_type NOT IN ('simple', 'monthly_averaged', 'yearly_averaged');

UPDATE public.budget_expenses
SET average_records = '[]'::jsonb
WHERE jsonb_typeof(average_records) <> 'array';

UPDATE public.budget_income_streams
SET value_type = 'simple'
WHERE value_type NOT IN ('simple', 'monthly_averaged', 'yearly_averaged');

UPDATE public.budget_income_streams
SET average_records = '[]'::jsonb
WHERE jsonb_typeof(average_records) <> 'array';

ALTER TABLE public.budget_expenses
  DROP CONSTRAINT IF EXISTS budget_expenses_value_type_check,
  DROP CONSTRAINT IF EXISTS budget_expenses_average_records_is_array_check,
  DROP CONSTRAINT IF EXISTS budget_expenses_averaged_consistency_check;

ALTER TABLE public.budget_expenses
  ADD CONSTRAINT budget_expenses_value_type_check
    CHECK (value_type IN ('simple', 'monthly_averaged', 'yearly_averaged')),
  ADD CONSTRAINT budget_expenses_average_records_is_array_check
    CHECK (jsonb_typeof(average_records) = 'array'),
  ADD CONSTRAINT budget_expenses_averaged_consistency_check
    CHECK (
      value_type = 'simple'
      OR (
        value_type = 'monthly_averaged'
        AND frequency_type = 'monthly'
        AND frequency_param IS NULL
        AND is_estimate = true
      )
      OR (
        value_type = 'yearly_averaged'
        AND frequency_type = 'annual'
        AND frequency_param IS NULL
        AND is_estimate = true
      )
    );

ALTER TABLE public.budget_income_streams
  DROP CONSTRAINT IF EXISTS budget_income_streams_value_type_check,
  DROP CONSTRAINT IF EXISTS budget_income_streams_average_records_is_array_check,
  DROP CONSTRAINT IF EXISTS budget_income_streams_averaged_consistency_check;

ALTER TABLE public.budget_income_streams
  ADD CONSTRAINT budget_income_streams_value_type_check
    CHECK (value_type IN ('simple', 'monthly_averaged', 'yearly_averaged')),
  ADD CONSTRAINT budget_income_streams_average_records_is_array_check
    CHECK (jsonb_typeof(average_records) = 'array'),
  ADD CONSTRAINT budget_income_streams_averaged_consistency_check
    CHECK (
      value_type = 'simple'
      OR (
        value_type = 'monthly_averaged'
        AND frequency_type = 'monthly'
        AND frequency_param IS NULL
        AND is_estimate = true
      )
      OR (
        value_type = 'yearly_averaged'
        AND frequency_type = 'annual'
        AND frequency_param IS NULL
        AND is_estimate = true
      )
    );

CREATE OR REPLACE FUNCTION public.budget_restore_household_snapshot(
  _household_id uuid,
  _snapshot jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_categories jsonb := COALESCE(_snapshot->'categories', '[]'::jsonb);
  v_linked_accounts jsonb := COALESCE(_snapshot->'linkedAccounts', '[]'::jsonb);
  v_incomes jsonb := COALESCE(_snapshot->'incomes', '[]'::jsonb);
  v_expenses jsonb := COALESCE(_snapshot->'expenses', '[]'::jsonb);
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_household_member(auth.uid(), _household_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF jsonb_typeof(v_categories) <> 'array'
    OR jsonb_typeof(v_linked_accounts) <> 'array'
    OR jsonb_typeof(v_incomes) <> 'array'
    OR jsonb_typeof(v_expenses) <> 'array' THEN
    RAISE EXCEPTION 'Snapshot payload is invalid';
  END IF;

  DELETE FROM public.budget_expenses WHERE household_id = _household_id;
  DELETE FROM public.budget_income_streams WHERE household_id = _household_id;
  DELETE FROM public.budget_linked_accounts WHERE household_id = _household_id;
  DELETE FROM public.budget_categories WHERE household_id = _household_id;

  IF jsonb_array_length(v_categories) > 0 THEN
    INSERT INTO public.budget_categories (id, household_id, name, color)
    SELECT COALESCE(x.id, gen_random_uuid()), _household_id, COALESCE(x.name, ''), x.color
    FROM jsonb_to_recordset(v_categories) AS x(id uuid, name text, color text);
  END IF;

  IF jsonb_array_length(v_linked_accounts) > 0 THEN
    INSERT INTO public.budget_linked_accounts (id, household_id, name, owner_partner, color)
    SELECT
      COALESCE(x.id, gen_random_uuid()),
      _household_id,
      COALESCE(x.name, ''),
      CASE WHEN x.owner_partner IN ('X', 'Y') THEN x.owner_partner ELSE 'X' END,
      x.color
    FROM jsonb_to_recordset(v_linked_accounts) AS x(id uuid, name text, owner_partner text, color text);
  END IF;

  IF jsonb_array_length(v_incomes) > 0 THEN
    INSERT INTO public.budget_income_streams (
      id,
      household_id,
      name,
      amount,
      frequency_type,
      frequency_param,
      partner_label,
      is_estimate,
      value_type,
      average_records
    )
    SELECT
      COALESCE(x.id, gen_random_uuid()),
      _household_id,
      COALESCE(x.name, ''),
      COALESCE(x.amount, 0),
      COALESCE(x.frequency_type, 'monthly'),
      x.frequency_param,
      CASE WHEN x.partner_label IN ('X', 'Y') THEN x.partner_label ELSE 'X' END,
      COALESCE(x.is_estimate, false),
      CASE
        WHEN x.value_type IN ('simple', 'monthly_averaged', 'yearly_averaged') THEN x.value_type
        ELSE 'simple'
      END,
      CASE
        WHEN jsonb_typeof(COALESCE(x.average_records, '[]'::jsonb)) = 'array' THEN COALESCE(x.average_records, '[]'::jsonb)
        ELSE '[]'::jsonb
      END
    FROM jsonb_to_recordset(v_incomes) AS x(
      id uuid,
      name text,
      amount numeric,
      frequency_type text,
      frequency_param integer,
      partner_label text,
      is_estimate boolean,
      value_type text,
      average_records jsonb
    );
  END IF;

  IF jsonb_array_length(v_expenses) > 0 THEN
    INSERT INTO public.budget_expenses (
      id,
      household_id,
      name,
      amount,
      frequency_type,
      frequency_param,
      benefit_x,
      category_id,
      linked_account_id,
      budget_id,
      is_estimate,
      value_type,
      average_records
    )
    SELECT
      COALESCE(x.id, gen_random_uuid()),
      _household_id,
      COALESCE(x.name, ''),
      COALESCE(x.amount, 0),
      COALESCE(x.frequency_type, 'monthly'),
      x.frequency_param,
      COALESCE(x.benefit_x, 50),
      CASE
        WHEN x.category_id IS NULL THEN NULL
        WHEN EXISTS (
          SELECT 1 FROM public.budget_categories c
          WHERE c.id = x.category_id
            AND c.household_id = _household_id
        ) THEN x.category_id
        ELSE NULL
      END,
      CASE
        WHEN x.linked_account_id IS NULL THEN NULL
        WHEN EXISTS (
          SELECT 1 FROM public.budget_linked_accounts la
          WHERE la.id = x.linked_account_id
            AND la.household_id = _household_id
        ) THEN x.linked_account_id
        ELSE NULL
      END,
      CASE
        WHEN x.budget_id IS NULL THEN NULL
        WHEN EXISTS (
          SELECT 1 FROM public.budget_budgets b
          WHERE b.id = x.budget_id
            AND b.household_id = _household_id
        ) THEN x.budget_id
        ELSE NULL
      END,
      COALESCE(x.is_estimate, false),
      CASE
        WHEN x.value_type IN ('simple', 'monthly_averaged', 'yearly_averaged') THEN x.value_type
        ELSE 'simple'
      END,
      CASE
        WHEN jsonb_typeof(COALESCE(x.average_records, '[]'::jsonb)) = 'array' THEN COALESCE(x.average_records, '[]'::jsonb)
        ELSE '[]'::jsonb
      END
    FROM jsonb_to_recordset(v_expenses) AS x(
      id uuid,
      name text,
      amount numeric,
      frequency_type text,
      frequency_param integer,
      benefit_x integer,
      category_id uuid,
      linked_account_id uuid,
      budget_id uuid,
      is_estimate boolean,
      value_type text,
      average_records jsonb
    );
  END IF;

  SELECT jsonb_build_object(
    'categories', COALESCE(
      (
        SELECT jsonb_agg(to_jsonb(c) ORDER BY c.name)
        FROM public.budget_categories c
        WHERE c.household_id = _household_id
      ),
      '[]'::jsonb
    ),
    'linkedAccounts', COALESCE(
      (
        SELECT jsonb_agg(to_jsonb(la) ORDER BY la.name)
        FROM public.budget_linked_accounts la
        WHERE la.household_id = _household_id
      ),
      '[]'::jsonb
    ),
    'incomes', COALESCE(
      (
        SELECT jsonb_agg(to_jsonb(i) ORDER BY i.created_at)
        FROM public.budget_income_streams i
        WHERE i.household_id = _household_id
      ),
      '[]'::jsonb
    ),
    'expenses', COALESCE(
      (
        SELECT jsonb_agg(to_jsonb(e) ORDER BY e.created_at)
        FROM public.budget_expenses e
        WHERE e.household_id = _household_id
      ),
      '[]'::jsonb
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;
