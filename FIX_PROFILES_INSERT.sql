-- Fix profiles table RLS policies to allow INSERT operations
-- This will allow users to create their own profiles

-- Add INSERT policy for profiles
CREATE POLICY "Users can create own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Add INSERT policy for user_settings
CREATE POLICY "Users can create own settings" ON public.user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);
