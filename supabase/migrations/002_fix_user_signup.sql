-- Fix: "Database error creating new user" when creating users in Supabase Auth
-- Run this in Supabase SQL Editor if user signup fails.
-- Requires 001_initial_schema.sql to have been applied first.

-- ---------------------------------------------------------------------------
-- Safer profile creation on auth.users insert
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assigned_role user_role;
  meta_role TEXT;
BEGIN
  meta_role := NULLIF(trim(NEW.raw_user_meta_data->>'role'), '');

  IF meta_role IS NOT NULL AND meta_role IN (
    'owner', 'admin', 'sales_staff', 'store_manager', 'accountant'
  ) THEN
    assigned_role := meta_role::user_role;
  ELSE
    assigned_role := 'sales_staff';
  END IF;

  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''),
      NULLIF(trim(NEW.email), ''),
      'User'
    ),
    COALESCE(NULLIF(trim(NEW.email), ''), 'no-email@local'),
    assigned_role
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Ensure auth can run the trigger and write profiles
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON public.profiles TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- RLS: allow signup trigger + users inserting their own profile
DROP POLICY IF EXISTS profiles_insert ON profiles;

CREATE POLICY profiles_insert ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Backfill profiles for auth users created before the fix
INSERT INTO public.profiles (id, full_name, email, role)
SELECT
  u.id,
  COALESCE(
    NULLIF(trim(u.raw_user_meta_data->>'full_name'), ''),
    NULLIF(trim(u.email), ''),
    'User'
  ),
  COALESCE(NULLIF(trim(u.email), ''), 'no-email@local'),
  'sales_staff'::user_role
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;
