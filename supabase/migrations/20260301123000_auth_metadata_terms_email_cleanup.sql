-- Remove redundant profile and terms metadata from auth.users.
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
  - 'display_name'
  - 'name'
  - 'email'
  - 'terms_version_accepted'
WHERE COALESCE(raw_user_meta_data, '{}'::jsonb) ?| ARRAY[
  'display_name',
  'name',
  'email',
  'terms_version_accepted'
];

-- Keep profile initialization behavior while ensuring redundant auth metadata is
-- removed for newly created users as well.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  terms_version text;
  is_test_user_flag boolean;
  requested_display_name text;
BEGIN
  -- Get terms version from user metadata if available, default to latest.
  terms_version := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'terms_version_accepted'), ''),
    (SELECT version FROM public.bathos_terms_versions ORDER BY
      split_part(version, '.', 1)::int DESC,
      split_part(version, '.', 2)::int DESC,
      split_part(version, '.', 3)::int DESC
    LIMIT 1)
  );

  -- art+<anything>@bath.garden accounts are considered test users.
  is_test_user_flag := lower(COALESCE(NEW.email, '')) LIKE 'art+_%@bath.garden';

  requested_display_name := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'display_name'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'name'), '')
  );

  INSERT INTO public.bathos_profiles (id, display_name, terms_version_accepted, is_test_user)
  VALUES (
    NEW.id,
    COALESCE(requested_display_name, NEW.email),
    terms_version,
    is_test_user_flag
  );

  UPDATE auth.users
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
    - 'display_name'
    - 'name'
    - 'email'
    - 'terms_version_accepted'
  WHERE id = NEW.id;

  RETURN NEW;
END;
$function$;
