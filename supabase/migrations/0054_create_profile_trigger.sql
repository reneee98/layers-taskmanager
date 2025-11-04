-- Migration: Create trigger to automatically create profile after user signup
-- Purpose: Automatically create a profile entry when a new user registers
-- Date: 2025-01-XX

-- Drop existing function and trigger if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile with SECURITY DEFINER to bypass RLS
  INSERT INTO public.profiles (id, email, display_name, role, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'display_name', SPLIT_PART(COALESCE(NEW.email, ''), '@', 1), 'User'),
    CASE 
      WHEN NEW.email = 'design@renemoravec.sk' THEN 'admin'
      ELSE 'user'
    END,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

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

