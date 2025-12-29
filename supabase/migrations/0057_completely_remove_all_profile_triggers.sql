-- Migration: Completely remove all profile-related triggers and hooks
-- Purpose: Ensure nothing blocks user registration
-- This should be run AFTER 0055_remove_profile_trigger.sql

-- Drop ALL triggers on auth.users that might be related to profiles
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_table = 'users' 
        AND event_object_schema = 'auth'
        AND trigger_name LIKE '%profile%' OR trigger_name LIKE '%user%' OR trigger_name LIKE '%new%'
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.trigger_name) || ' ON auth.users CASCADE';
        RAISE NOTICE 'Dropped trigger: %', r.trigger_name;
    END LOOP;
END $$;

-- Drop the handle_new_user function completely (if it exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'handle_new_user' 
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN
        DROP FUNCTION public.handle_new_user() CASCADE;
        RAISE NOTICE 'Dropped function: handle_new_user';
    ELSE
        RAISE NOTICE 'Function handle_new_user does not exist, skipping';
    END IF;
END $$;

-- Verify no triggers exist on auth.users
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
AND event_object_schema = 'auth';

