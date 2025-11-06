-- Migration: Create trigger to automatically create profile after user signup
-- Purpose: Automatically create a profile entry when a new user registers
-- Date: 2025-01-XX

-- Drop existing function and trigger if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create function to handle new user creation
-- This function MUST use SECURITY DEFINER to bypass RLS when creating profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_display_name TEXT;
  v_email TEXT;
BEGIN
  -- Get email safely
  v_email := COALESCE(NEW.email, '');
  
  -- Get display_name from metadata or email
  v_display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    CASE 
      WHEN v_email != '' AND POSITION('@' IN v_email) > 0 THEN SPLIT_PART(v_email, '@', 1)
      ELSE 'User'
    END
  );
  
  -- Insert profile - SECURITY DEFINER bypasses RLS automatically
  -- Use ON CONFLICT to prevent errors if profile already exists
  BEGIN
    INSERT INTO public.profiles (id, email, display_name, role, created_at, updated_at)
    VALUES (
      NEW.id,
      v_email,
      v_display_name,
      CASE 
        WHEN v_email = 'design@renemoravec.sk' THEN 'admin'
        ELSE 'member'
      END,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      updated_at = NOW();
  EXCEPTION
    WHEN OTHERS THEN
      -- Log error but don't fail
      RAISE WARNING 'Error inserting profile for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- CRITICAL: Never fail user creation, just log the error
    -- This ensures registration always succeeds even if profile creation fails
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    -- Always return NEW to allow user creation to proceed
    RETURN NEW;
END;
$$;

-- Set function owner to postgres (has all permissions)
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- Create trigger on auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant execute permission to service_role (Supabase uses this internally)
-- Note: service_role has full access and can bypass RLS
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;

-- Note: SECURITY DEFINER functions automatically bypass RLS
-- The function runs as the function owner (postgres), so it has full access
-- No additional RLS policy is needed

-- Add comment
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates a profile entry when a new user registers';

