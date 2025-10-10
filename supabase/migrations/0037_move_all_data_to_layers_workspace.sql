-- Move all existing data to Layers s.r.o. workspace
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
        -- Get or create workspace for this user
        SELECT id INTO workspace_id_var 
        FROM public.workspaces 
        WHERE owner_id = user_id_var;
        
        -- If workspace doesn't exist, create it
        IF workspace_id_var IS NULL THEN
            INSERT INTO public.workspaces (name, description, owner_id)
            VALUES ('Layers s.r.o.', 'Hlavný workspace pre Layers s.r.o.', user_id_var)
            RETURNING id INTO workspace_id_var;
        ELSE
            -- Update existing workspace name
            UPDATE public.workspaces 
            SET name = 'Layers s.r.o.', 
                description = 'Hlavný workspace pre Layers s.r.o.',
                updated_at = NOW()
            WHERE id = workspace_id_var;
        END IF;
        
        -- Move all existing data to this workspace
        -- Update clients (set workspace_id for all clients that don't have one)
        UPDATE public.clients 
        SET workspace_id = workspace_id_var 
        WHERE workspace_id IS NULL;
        
        -- Update projects (set workspace_id for all projects that don't have one)
        UPDATE public.projects 
        SET workspace_id = workspace_id_var 
        WHERE workspace_id IS NULL;
        
        -- Update tasks (set workspace_id for all tasks that don't have one)
        UPDATE public.tasks 
        SET workspace_id = workspace_id_var 
        WHERE workspace_id IS NULL;
        
        -- Update time_entries (set workspace_id for all time entries that don't have one)
        UPDATE public.time_entries 
        SET workspace_id = workspace_id_var 
        WHERE workspace_id IS NULL;
        
        -- Update task_comments (set workspace_id for all comments that don't have one)
        UPDATE public.task_comments 
        SET workspace_id = workspace_id_var 
        WHERE workspace_id IS NULL;
        
        -- Update task_assignees (set workspace_id for all assignees that don't have one)
        UPDATE public.task_assignees 
        SET workspace_id = workspace_id_var 
        WHERE workspace_id IS NULL;
        
        -- Update task_timers (set workspace_id for all timers that don't have one)
        UPDATE public.task_timers 
        SET workspace_id = workspace_id_var 
        WHERE workspace_id IS NULL;
        
        RAISE NOTICE 'Successfully moved all data to Layers s.r.o. workspace (ID: %)', workspace_id_var;
        
        -- Show summary of moved data
        RAISE NOTICE 'Clients moved: %', (SELECT COUNT(*) FROM public.clients WHERE workspace_id = workspace_id_var);
        RAISE NOTICE 'Projects moved: %', (SELECT COUNT(*) FROM public.projects WHERE workspace_id = workspace_id_var);
        RAISE NOTICE 'Tasks moved: %', (SELECT COUNT(*) FROM public.tasks WHERE workspace_id = workspace_id_var);
        RAISE NOTICE 'Time entries moved: %', (SELECT COUNT(*) FROM public.time_entries WHERE workspace_id = workspace_id_var);
        
    ELSE
        RAISE NOTICE 'User design@renemoravec.sk not found - creating workspace anyway';
        
        -- Create workspace even if user doesn't exist yet
        INSERT INTO public.workspaces (name, description, owner_id)
        VALUES ('Layers s.r.o.', 'Hlavný workspace pre Layers s.r.o.', gen_random_uuid())
        RETURNING id INTO workspace_id_var;
        
        -- Move all existing data to this workspace
        UPDATE public.clients SET workspace_id = workspace_id_var WHERE workspace_id IS NULL;
        UPDATE public.projects SET workspace_id = workspace_id_var WHERE workspace_id IS NULL;
        UPDATE public.tasks SET workspace_id = workspace_id_var WHERE workspace_id IS NULL;
        UPDATE public.time_entries SET workspace_id = workspace_id_var WHERE workspace_id IS NULL;
        UPDATE public.task_comments SET workspace_id = workspace_id_var WHERE workspace_id IS NULL;
        UPDATE public.task_assignees SET workspace_id = workspace_id_var WHERE workspace_id IS NULL;
        UPDATE public.task_timers SET workspace_id = workspace_id_var WHERE workspace_id IS NULL;
        
        RAISE NOTICE 'Created Layers s.r.o. workspace and moved all data (ID: %)', workspace_id_var;
    END IF;
END $$;
