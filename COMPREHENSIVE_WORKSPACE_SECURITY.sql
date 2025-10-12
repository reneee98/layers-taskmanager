-- COMPREHENSIVE WORKSPACE SECURITY FIX
-- This script ensures complete workspace isolation and security

-- 1. First, let's ensure all tables have proper workspace_id columns
-- Add workspace_id to any missing tables
ALTER TABLE public.cost_items 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.task_assignees 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.task_comments 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.time_entries 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.task_timers 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- 2. Update existing data to have workspace_id
UPDATE public.cost_items 
SET workspace_id = p.workspace_id
FROM public.projects p
WHERE cost_items.project_id = p.id 
AND cost_items.workspace_id IS NULL;

UPDATE public.task_assignees 
SET workspace_id = t.workspace_id
FROM public.tasks t
WHERE task_assignees.task_id = t.id 
AND task_assignees.workspace_id IS NULL;

UPDATE public.task_comments 
SET workspace_id = t.workspace_id
FROM public.tasks t
WHERE task_comments.task_id = t.id 
AND task_comments.workspace_id IS NULL;

UPDATE public.time_entries 
SET workspace_id = t.workspace_id
FROM public.tasks t
WHERE time_entries.task_id = t.id 
AND time_entries.workspace_id IS NULL;

UPDATE public.task_timers 
SET workspace_id = t.workspace_id
FROM public.tasks t
WHERE task_timers.task_id = t.id 
AND task_timers.workspace_id IS NULL;

-- 3. Make workspace_id NOT NULL for all tables
ALTER TABLE public.cost_items 
ALTER COLUMN workspace_id SET NOT NULL;

ALTER TABLE public.task_assignees 
ALTER COLUMN workspace_id SET NOT NULL;

ALTER TABLE public.task_comments 
ALTER COLUMN workspace_id SET NOT NULL;

ALTER TABLE public.time_entries 
ALTER COLUMN workspace_id SET NOT NULL;

ALTER TABLE public.task_timers 
ALTER COLUMN workspace_id SET NOT NULL;

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cost_items_workspace_id ON public.cost_items(workspace_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_workspace_id ON public.task_assignees(workspace_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_workspace_id ON public.task_comments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_workspace_id ON public.time_entries(workspace_id);
CREATE INDEX IF NOT EXISTS idx_task_timers_workspace_id ON public.task_timers(workspace_id);

-- 5. Create comprehensive RLS policies
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view workspaces they own" ON public.workspaces;
DROP POLICY IF EXISTS "Users can update workspaces they own" ON public.workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can view workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can manage workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can view workspace invitations" ON public.workspace_invitations;
DROP POLICY IF EXISTS "Users can manage workspace invitations" ON public.workspace_invitations;

-- Workspaces policies
CREATE POLICY "Users can view workspaces they own or are members of" ON public.workspaces
    FOR SELECT USING (
        owner_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE workspace_id = id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update workspaces they own" ON public.workspaces
    FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can create workspaces" ON public.workspaces
    FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Workspace members policies
CREATE POLICY "Users can view workspace members of their workspaces" ON public.workspace_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workspaces 
            WHERE id = workspace_id AND owner_id = auth.uid()
        ) OR 
        EXISTS (
            SELECT 1 FROM public.workspace_members wm2
            WHERE wm2.workspace_id = workspace_id AND wm2.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage workspace members of their workspaces" ON public.workspace_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.workspaces 
            WHERE id = workspace_id AND owner_id = auth.uid()
        )
    );

-- Workspace invitations policies
CREATE POLICY "Users can view workspace invitations of their workspaces" ON public.workspace_invitations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workspaces 
            WHERE id = workspace_id AND owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage workspace invitations of their workspaces" ON public.workspace_invitations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.workspaces 
            WHERE id = workspace_id AND owner_id = auth.uid()
        )
    );

-- Projects policies
CREATE POLICY "Users can view projects in their workspaces" ON public.projects
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workspaces 
            WHERE id = workspace_id AND owner_id = auth.uid()
        ) OR 
        EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE workspace_id = projects.workspace_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage projects in their workspaces" ON public.projects
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.workspaces 
            WHERE id = workspace_id AND owner_id = auth.uid()
        ) OR 
        EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE workspace_id = projects.workspace_id AND user_id = auth.uid()
        )
    );

-- Tasks policies
CREATE POLICY "Users can view tasks in their workspaces" ON public.tasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workspaces 
            WHERE id = workspace_id AND owner_id = auth.uid()
        ) OR 
        EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE workspace_id = tasks.workspace_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage tasks in their workspaces" ON public.tasks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.workspaces 
            WHERE id = workspace_id AND owner_id = auth.uid()
        ) OR 
        EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE workspace_id = tasks.workspace_id AND user_id = auth.uid()
        )
    );

-- Clients policies
CREATE POLICY "Users can view clients in their workspaces" ON public.clients
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workspaces 
            WHERE id = workspace_id AND owner_id = auth.uid()
        ) OR 
        EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE workspace_id = clients.workspace_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage clients in their workspaces" ON public.clients
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.workspaces 
            WHERE id = workspace_id AND owner_id = auth.uid()
        ) OR 
        EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE workspace_id = clients.workspace_id AND user_id = auth.uid()
        )
    );

-- Cost items policies
CREATE POLICY "Users can view cost items in their workspaces" ON public.cost_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workspaces 
            WHERE id = workspace_id AND owner_id = auth.uid()
        ) OR 
        EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE workspace_id = cost_items.workspace_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage cost items in their workspaces" ON public.cost_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.workspaces 
            WHERE id = workspace_id AND owner_id = auth.uid()
        ) OR 
        EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE workspace_id = cost_items.workspace_id AND user_id = auth.uid()
        )
    );

-- Task assignees policies
CREATE POLICY "Users can view task assignees in their workspaces" ON public.task_assignees
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workspaces 
            WHERE id = workspace_id AND owner_id = auth.uid()
        ) OR 
        EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE workspace_id = task_assignees.workspace_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage task assignees in their workspaces" ON public.task_assignees
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.workspaces 
            WHERE id = workspace_id AND owner_id = auth.uid()
        ) OR 
        EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE workspace_id = task_assignees.workspace_id AND user_id = auth.uid()
        )
    );

-- Task comments policies
CREATE POLICY "Users can view task comments in their workspaces" ON public.task_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workspaces 
            WHERE id = workspace_id AND owner_id = auth.uid()
        ) OR 
        EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE workspace_id = task_comments.workspace_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage task comments in their workspaces" ON public.task_comments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.workspaces 
            WHERE id = workspace_id AND owner_id = auth.uid()
        ) OR 
        EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE workspace_id = task_comments.workspace_id AND user_id = auth.uid()
        )
    );

-- Time entries policies
CREATE POLICY "Users can view time entries in their workspaces" ON public.time_entries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workspaces 
            WHERE id = workspace_id AND owner_id = auth.uid()
        ) OR 
        EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE workspace_id = time_entries.workspace_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage time entries in their workspaces" ON public.time_entries
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.workspaces 
            WHERE id = workspace_id AND owner_id = auth.uid()
        ) OR 
        EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE workspace_id = time_entries.workspace_id AND user_id = auth.uid()
        )
    );

-- Task timers policies
CREATE POLICY "Users can view task timers in their workspaces" ON public.task_timers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workspaces 
            WHERE id = workspace_id AND owner_id = auth.uid()
        ) OR 
        EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE workspace_id = task_timers.workspace_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage task timers in their workspaces" ON public.task_timers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.workspaces 
            WHERE id = workspace_id AND owner_id = auth.uid()
        ) OR 
        EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE workspace_id = task_timers.workspace_id AND user_id = auth.uid()
        )
    );

-- 6. Create a function to validate workspace access
CREATE OR REPLACE FUNCTION validate_workspace_access(p_user_id UUID, p_workspace_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user is owner or member of the workspace
    RETURN EXISTS (
        SELECT 1 FROM public.workspaces 
        WHERE id = p_workspace_id AND owner_id = p_user_id
    ) OR EXISTS (
        SELECT 1 FROM public.workspace_members 
        WHERE workspace_id = p_workspace_id AND user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create a function to get user's accessible workspaces
CREATE OR REPLACE FUNCTION get_user_accessible_workspaces(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    role TEXT,
    owner_id UUID,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w.id,
        w.name,
        w.description,
        CASE 
            WHEN w.owner_id = p_user_id THEN 'owner'::TEXT
            ELSE 'member'::TEXT
        END as role,
        w.owner_id,
        w.created_at
    FROM public.workspaces w
    WHERE w.owner_id = p_user_id
    OR EXISTS (
        SELECT 1 FROM public.workspace_members wm 
        WHERE wm.workspace_id = w.id AND wm.user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Enable RLS on all tables
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_timers ENABLE ROW LEVEL SECURITY;

-- 9. Create a comprehensive audit function
CREATE OR REPLACE FUNCTION audit_workspace_access(p_user_id UUID, p_workspace_id UUID, p_action TEXT)
RETURNS VOID AS $$
BEGIN
    -- Log workspace access attempts for security monitoring
    INSERT INTO public.audit_log (user_id, workspace_id, action, timestamp)
    VALUES (p_user_id, p_workspace_id, p_action, NOW())
    ON CONFLICT DO NOTHING;
EXCEPTION
    WHEN OTHERS THEN
        -- Ignore audit log errors to not break the main functionality
        NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create audit_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit_log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only allow users to see their own audit logs
CREATE POLICY "Users can view their own audit logs" ON public.audit_log
    FOR SELECT USING (user_id = auth.uid());

-- 11. Create indexes for audit_log
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_workspace_id ON public.audit_log(workspace_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON public.audit_log(timestamp);

COMMIT;
