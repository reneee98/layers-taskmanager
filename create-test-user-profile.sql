-- Create profile for test user
-- Run this in Supabase SQL Editor

-- 1. Check if test user exists in auth.users
SELECT 
    'AUTH USERS CHECK' as status,
    id,
    email,
    created_at
FROM auth.users 
WHERE id = 'c6e43e09-ffb0-46b5-8048-ea8d28fbf026';

-- 2. Create profile for test user
INSERT INTO public.profiles (id, email, display_name, avatar_url, role, created_at, updated_at)
VALUES (
    'c6e43e09-ffb0-46b5-8048-ea8d28fbf026',
    'renkomoravec@gmail.com',
    'Testovaci user',
    null,
    'user',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = EXCLUDED.display_name,
    updated_at = NOW();

-- 3. Verify profile was created
SELECT 
    'AFTER INSERT' as status,
    id,
    email,
    display_name,
    role
FROM public.profiles 
WHERE id = 'c6e43e09-ffb0-46b5-8048-ea8d28fbf026';
