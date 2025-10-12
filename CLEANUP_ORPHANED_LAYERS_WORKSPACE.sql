-- Clean up orphaned Layers workspace that might be visible to all users
-- This script removes any workspace named "Layers s.r.o." that doesn't have a valid owner

DO $$
DECLARE
    orphaned_workspace_id UUID;
    valid_owner_id UUID;
BEGIN
    -- Find orphaned Layers workspace (workspace with name "Layers s.r.o." but no valid owner)
    SELECT id INTO orphaned_workspace_id
    FROM public.workspaces 
    WHERE name = 'Layers s.r.o.' 
    AND (owner_id NOT IN (SELECT id FROM auth.users) OR owner_id IS NULL);
    
    -- Find valid owner for design@renemoravec.sk
    SELECT id INTO valid_owner_id
    FROM auth.users 
    WHERE email = 'design@renemoravec.sk';
    
    IF orphaned_workspace_id IS NOT NULL THEN
        RAISE NOTICE 'Found orphaned Layers workspace with ID: %', orphaned_workspace_id;
        
        -- If we have a valid owner, transfer the workspace to them
        IF valid_owner_id IS NOT NULL THEN
            RAISE NOTICE 'Transferring orphaned workspace to valid owner: %', valid_owner_id;
            
            -- Update the workspace to have the correct owner
            UPDATE public.workspaces 
            SET owner_id = valid_owner_id,
                updated_at = NOW()
            WHERE id = orphaned_workspace_id;
            
            RAISE NOTICE 'Successfully transferred workspace to valid owner';
        ELSE
            RAISE NOTICE 'No valid owner found, deleting orphaned workspace and its data';
            
            -- Delete all data associated with this orphaned workspace
            DELETE FROM public.task_timers WHERE workspace_id = orphaned_workspace_id;
            DELETE FROM public.task_assignees WHERE workspace_id = orphaned_workspace_id;
            DELETE FROM public.task_comments WHERE workspace_id = orphaned_workspace_id;
            DELETE FROM public.time_entries WHERE workspace_id = orphaned_workspace_id;
            DELETE FROM public.tasks WHERE workspace_id = orphaned_workspace_id;
            DELETE FROM public.projects WHERE workspace_id = orphaned_workspace_id;
            DELETE FROM public.clients WHERE workspace_id = orphaned_workspace_id;
            DELETE FROM public.workspace_members WHERE workspace_id = orphaned_workspace_id;
            DELETE FROM public.workspace_invitations WHERE workspace_id = orphaned_workspace_id;
            DELETE FROM public.workspaces WHERE id = orphaned_workspace_id;
            
            RAISE NOTICE 'Successfully deleted orphaned workspace and all associated data';
        END IF;
    ELSE
        RAISE NOTICE 'No orphaned Layers workspace found';
    END IF;
END $$;
