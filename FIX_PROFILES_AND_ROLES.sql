-- Fix profiles table and user_role enum

-- First, add missing values to user_role enum
DO $$
BEGIN
    -- Add 'owner' to user_role enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'owner' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')) THEN
        ALTER TYPE user_role ADD VALUE 'owner';
    END IF;
    
    -- Add 'designer' to user_role enum if it doesn't exist  
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'designer' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')) THEN
        ALTER TYPE user_role ADD VALUE 'designer';
    END IF;
END $$;

-- Disable RLS temporarily to allow data migration
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Insert all data from user_profiles into profiles
INSERT INTO public.profiles (id, email, display_name, avatar_url, role, created_at, updated_at)
SELECT 
    id,
    email,
    COALESCE(name, split_part(email, '@', 1)) as display_name,
    NULL as avatar_url,
    CASE 
        WHEN role = 'owner' THEN 'owner'::user_role
        WHEN role = 'designer' THEN 'designer'::user_role
        ELSE 'user'::user_role
    END as role,
    created_at,
    updated_at
FROM public.user_profiles
WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = user_profiles.id
);

-- Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Owners can manage all profiles" ON public.profiles;

-- Create new RLS policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Owners can manage all profiles" ON public.profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Create a trigger to automatically create profiles when new users are created
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    CASE 
      WHEN NEW.email = 'design@renemoravec.sk' THEN 'owner'::user_role
      ELSE 'user'::user_role
    END
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to create user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();
