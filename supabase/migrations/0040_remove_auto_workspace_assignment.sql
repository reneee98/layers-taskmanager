-- Migration: Remove automatic workspace assignment trigger
-- Purpose: Prevent new users from being automatically added to Layers workspace
-- Date: 2025-10-29
-- 
-- This migration removes the trigger that automatically adds new users to the
-- "Layers s.r.o." workspace when they register.

-- Step 1: List all triggers on auth.users to identify what needs to be removed
DO $$
DECLARE
    trigger_name TEXT;
BEGIN
    RAISE NOTICE 'Searching for triggers on auth.users...';
    
    FOR trigger_name IN
        SELECT t.trigger_name
        FROM information_schema.triggers t
        WHERE t.event_object_schema = 'auth'
          AND t.event_object_table = 'users'
    LOOP
        RAISE NOTICE 'Found trigger: %', trigger_name;
    END LOOP;
END $$;

-- Step 2: Find and drop functions that automatically add users to Layers workspace
DO $$
DECLARE
    func_name TEXT;
    func_schema TEXT;
BEGIN
    RAISE NOTICE 'Searching for functions that add to Layers workspace...';
    
    FOR func_schema, func_name IN
        SELECT 
            routine_schema,
            routine_name
        FROM information_schema.routines
        WHERE routine_schema IN ('auth', 'public')
          AND routine_type = 'FUNCTION'
          AND (
            routine_definition LIKE '%Layers s.r.o.%'
            OR routine_definition LIKE '%Layers workspace%'
            OR (routine_definition LIKE '%Layers%' AND routine_definition LIKE '%workspace_members%')
          )
          AND routine_definition LIKE '%INSERT INTO%workspace_members%'
    LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS %I.%I() CASCADE', func_schema, func_name);
        RAISE NOTICE 'Dropped function: %.%', func_schema, func_name;
    END LOOP;
END $$;

-- Step 3: Find and drop triggers that call functions adding to workspace_members
-- Note: We need to check triggers more carefully
DO $$
DECLARE
    trigger_rec RECORD;
    func_oid OID;
BEGIN
    RAISE NOTICE 'Searching for triggers that add to workspace_members...';
    
    FOR trigger_rec IN
        SELECT 
            tgname as trigger_name,
            tgrelid::regclass as table_name,
            tgfoid as function_oid
        FROM pg_trigger
        WHERE tgrelid = 'auth.users'::regclass
          AND tgisinternal = false
    LOOP
        -- Check if the function associated with this trigger contains workspace_members or Layers
        SELECT prosrc INTO func_oid
        FROM pg_proc
        WHERE oid = trigger_rec.function_oid
        AND (
            prosrc LIKE '%workspace_members%'
            OR prosrc LIKE '%Layers%'
        );
        
        IF func_oid IS NOT NULL THEN
            EXECUTE format('DROP TRIGGER IF EXISTS %I ON auth.users CASCADE', trigger_rec.trigger_name);
            RAISE NOTICE 'Dropped trigger: %', trigger_rec.trigger_name;
        END IF;
    END LOOP;
END $$;

-- Step 4: Alternative approach - directly drop trigger if we know its name pattern
-- Common trigger names: handle_new_user, on_auth_user_created, etc.
DO $$
DECLARE
    known_trigger_names TEXT[] := ARRAY[
        'handle_new_user',
        'on_auth_user_created',
        'add_user_to_layers_workspace',
        'trigger_add_user_to_layers'
    ];
    trigger_name TEXT;
BEGIN
    FOREACH trigger_name IN ARRAY known_trigger_names
    LOOP
        BEGIN
            EXECUTE format('DROP TRIGGER IF EXISTS %I ON auth.users CASCADE', trigger_name);
            RAISE NOTICE 'Attempted to drop trigger: %', trigger_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Trigger % does not exist or could not be dropped: %', trigger_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- Step 5: Add extra protection - trigger to prevent unauthorized additions
CREATE OR REPLACE FUNCTION prevent_unauthorized_workspace_member_addition()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the insert is authorized (by owner)
  -- This should never be needed if RLS works, but adds extra safety
  IF NOT EXISTS (
    SELECT 1 FROM workspaces 
    WHERE id = NEW.workspace_id 
    AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized attempt to add user to workspace: User % attempted to add user % to workspace % without being owner', 
      auth.uid(), 
      NEW.user_id, 
      NEW.workspace_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists (in case it was created before)
DROP TRIGGER IF EXISTS trigger_prevent_unauthorized_workspace_addition ON workspace_members;

-- Create trigger as extra safety measure
CREATE TRIGGER trigger_prevent_unauthorized_workspace_addition
  BEFORE INSERT ON workspace_members
  FOR EACH ROW
  EXECUTE FUNCTION prevent_unauthorized_workspace_member_addition();

DO $$
BEGIN
  RAISE NOTICE 'Added extra protection trigger on workspace_members';
END $$;

-- Step 6: Verify RLS is enabled on workspace_members
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'workspace_members'
    AND rowsecurity = TRUE
  ) THEN
    ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on workspace_members';
  ELSE
    RAISE NOTICE 'RLS already enabled on workspace_members';
  END IF;
END $$;

-- Step 7: Final verification - check if any problematic triggers remain
DO $$
DECLARE
    remaining_count INT;
BEGIN
    SELECT COUNT(*) INTO remaining_count
    FROM pg_trigger tg
    JOIN pg_proc p ON p.oid = tg.tgfoid
    WHERE tg.tgrelid = 'auth.users'::regclass
      AND tg.tgisinternal = false
      AND (p.prosrc LIKE '%workspace_members%' OR p.prosrc LIKE '%Layers%');
    
    IF remaining_count > 0 THEN
        RAISE WARNING 'Found % remaining trigger(s) - manual review needed!', remaining_count;
    ELSE
        RAISE NOTICE 'Successfully removed automatic workspace assignment trigger';
        RAISE NOTICE 'New users will NO LONGER be automatically added to Layers workspace';
    END IF;
END $$;
