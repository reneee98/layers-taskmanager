-- Update workspace for design@renemoravec.sk user
-- First, get the user ID
DO $$
DECLARE
    user_id_var UUID;
    workspace_id_var UUID;
BEGIN
    -- Get user ID for design@renemoravec.sk
    SELECT id INTO user_id_var 
    FROM auth.users 
    WHERE email = 'design@renemoravec.sk';
    
    IF user_id_var IS NOT NULL THEN
        -- Update or create workspace for this user
        INSERT INTO public.workspaces (name, description, owner_id)
        VALUES ('Layers s.r.o.', 'Hlavný workspace pre Layers s.r.o.', user_id_var)
        ON CONFLICT (owner_id) 
        DO UPDATE SET 
            name = 'Layers s.r.o.',
            description = 'Hlavný workspace pre Layers s.r.o.',
            updated_at = NOW()
        RETURNING id INTO workspace_id_var;
        
        -- Get workspace ID if it already existed
        IF workspace_id_var IS NULL THEN
            SELECT id INTO workspace_id_var 
            FROM public.workspaces 
            WHERE owner_id = user_id_var;
        END IF;
        
        -- Update all existing data to belong to this workspace
        -- Update clients
        UPDATE public.clients 
        SET workspace_id = workspace_id_var 
        WHERE workspace_id IS NULL;
        
        -- Update projects
        UPDATE public.projects 
        SET workspace_id = workspace_id_var 
        WHERE workspace_id IS NULL;
        
        -- Update tasks
        UPDATE public.tasks 
        SET workspace_id = workspace_id_var 
        WHERE workspace_id IS NULL;
        
        -- Update time entries (through tasks)
        UPDATE public.time_entries 
        SET workspace_id = workspace_id_var 
        WHERE workspace_id IS NULL;
        
        -- Update task comments (through tasks)
        UPDATE public.task_comments 
        SET workspace_id = workspace_id_var 
        WHERE workspace_id IS NULL;
        
        -- Update task assignees (through tasks)
        UPDATE public.task_assignees 
        SET workspace_id = workspace_id_var 
        WHERE workspace_id IS NULL;
        
        -- Update task timers (through tasks)
        UPDATE public.task_timers 
        SET workspace_id = workspace_id_var 
        WHERE workspace_id IS NULL;
        
        RAISE NOTICE 'Updated workspace for user % to "Layers s.r.o." with ID %', user_id_var, workspace_id_var;
    ELSE
        RAISE NOTICE 'User design@renemoravec.sk not found';
    END IF;
END $$;
