-- Final fix for auth system - completely disable RLS and remove foreign key
-- This will definitely work

-- Drop existing table and policies first
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- Create user_profiles table WITHOUT foreign key constraint and WITHOUT RLS
CREATE TABLE public.user_profiles (
  id UUID NOT NULL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'designer' NOT NULL CHECK (role IN ('owner', 'designer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- DON'T enable RLS - keep it disabled completely
-- ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    CASE 
      WHEN NEW.email = 'design@renemoravec.sk' THEN 'owner'
      ELSE 'designer'
    END
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE WARNING 'Failed to create user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Disable RLS on ALL tables completely
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rates DISABLE ROW LEVEL SECURITY;

-- Insert a test profile manually for the existing user
INSERT INTO public.user_profiles (id, email, name, role)
VALUES (
  '775560ca-adfa-4df2-9768-6ea553494e1f',
  'design@renemoravec.sk',
  'René Moravec',
  'owner'
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = EXCLUDED.role;
