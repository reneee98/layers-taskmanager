-- Fix test user profile issue
-- Run this in Supabase SQL Editor

-- 1. First, check if test user exists in auth.users
SELECT 
    'AUTH USERS CHECK' as status,
    id,
    email,
    created_at
FROM auth.users 
WHERE id = 'c6e43e09-ffb0-46b5-8048-ea8d28fbf026';

-- 2. Check if test user has profile
SELECT 
    'PROFILES CHECK' as status,
    id,
    email,
    display_name,
    role
FROM public.profiles 
WHERE id = 'c6e43e09-ffb0-46b5-8048-ea8d28fbf026';

-- 3. Create profile for test user (if it doesn't exist)
INSERT INTO public.profiles (id, email, display_name, avatar_url, role, created_at, updated_at)
VALUES (
    'c6e43e09-ffb0-46b5-8048-ea8d28fbf026',
    'test@example.com',
    'Testovaci user',
    null,
    'user',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 4. Verify profile was created
SELECT 
    'AFTER INSERT' as status,
    id,
    email,
    display_name,
    role
FROM public.profiles 
WHERE id = 'c6e43e09-ffb0-46b5-8048-ea8d28fbf026';

-- 5. Check test user's workspace
SELECT 
    'TEST USER WORKSPACE' as status,
    w.id,
    w.name,
    w.owner_id,
    w.created_at
FROM public.workspaces w
WHERE w.owner_id = 'c6e43e09-ffb0-46b5-8048-ea8d28fbf026';
