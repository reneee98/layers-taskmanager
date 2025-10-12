-- Migrate data from user_profiles to profiles table

-- First, disable RLS temporarily to allow data migration
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