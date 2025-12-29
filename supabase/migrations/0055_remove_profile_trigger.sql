-- Migration: Remove profile trigger to fix registration errors
-- Purpose: Remove the trigger that's causing registration to fail
-- We'll use API endpoint instead to create profiles after registration

-- Drop trigger first (if it exists)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop function if it exists (only if it exists, to avoid errors)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'handle_new_user' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
  END IF;
END $$;

