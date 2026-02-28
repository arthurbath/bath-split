-- Fix member-list RPC return type mismatch (varchar -> text)

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
    u.email::text,
    NULLIF(trim(p.display_name), '')::text,
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
    u.email::text,
    NULLIF(trim(p.display_name), '')::text,
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

GRANT EXECUTE ON FUNCTION public.budget_list_household_members(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.drawers_list_household_members(uuid) TO authenticated;
