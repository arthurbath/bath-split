

# Fix: Household Creation Blocked by Missing Table Permissions

## Problem

The `households` INSERT returns `403` ("new row violates row-level security policy") because **the `authenticated` and `anon` database roles have no table-level GRANT permissions** on any public tables. RLS policies are correct, but without GRANTs, PostgreSQL denies all access before RLS is even evaluated.

The previous migration attempted to fix this but the GRANTs were not applied.

## Root Cause

PostgreSQL requires two layers of permission:
1. **Table-level GRANTs** (role can access the table at all)
2. **RLS policies** (row-level filtering)

Layer 1 is completely missing for all tables.

## Plan

### Step 1: Database Migration - Grant Table Permissions

Run a new migration that explicitly grants permissions on each table individually (rather than using `ALL TABLES` which may not work in all contexts):

```sql
-- Grant permissions on each table explicitly
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.households TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.household_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.income_streams TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restore_points TO authenticated;

-- Anon read access
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT ON public.households TO anon;

-- Default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO anon;
```

### Step 2: Add Error Handling to createHousehold

Update `src/hooks/useHouseholdData.ts` so that if the household insert fails, the error is caught and surfaced via a toast notification instead of silently freezing the UI.

### Step 3: Add Error Handling to HouseholdSetup

Update `src/components/HouseholdSetup.tsx` to catch errors from `onComplete` and show an error message, and reset the loading state so the button becomes clickable again.

## Technical Details

- **Files modified:**
  - New SQL migration file
  - `src/hooks/useHouseholdData.ts` (error handling in `createHousehold`)
  - `src/components/HouseholdSetup.tsx` (error display)

