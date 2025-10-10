-- Add workspace_id to tables that don't have it yet

-- Add workspace_id to time_entries if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'time_entries' 
        AND column_name = 'workspace_id'
    ) THEN
        ALTER TABLE public.time_entries ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add workspace_id to task_comments if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'task_comments' 
        AND column_name = 'workspace_id'
    ) THEN
        ALTER TABLE public.task_comments ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add workspace_id to task_assignees if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'task_assignees' 
        AND column_name = 'workspace_id'
    ) THEN
        ALTER TABLE public.task_assignees ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add workspace_id to task_timers if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'task_timers' 
        AND column_name = 'workspace_id'
    ) THEN
        ALTER TABLE public.task_timers ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
    END IF;
END $$;
