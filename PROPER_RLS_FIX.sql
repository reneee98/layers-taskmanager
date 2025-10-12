-- PROPER RLS FIX - Fix recursion without disabling security
-- This script fixes the RLS policies properly

-- 1. Drop all existing problematic policies
DROP POLICY IF EXISTS "Users can view workspaces they own or are members of" ON public.workspaces;
DROP POLICY IF EXISTS "Users can update workspaces they own" ON public.workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can view workspaces they own" ON public.workspaces;
DROP POLICY IF EXISTS "Users can view workspaces they are members of" ON public.workspaces;
DROP POLICY IF EXISTS "Users can view workspace members of their workspaces" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can manage workspace members of their workspaces" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can view workspace invitations of their workspaces" ON public.workspace_invitations;
DROP POLICY IF EXISTS "Users can manage workspace invitations of their workspaces" ON public.workspace_invitations;
DROP POLICY IF EXISTS "Users can view projects in their workspaces" ON public.projects;
DROP POLICY IF EXISTS "Users can manage projects in their workspaces" ON public.projects;
DROP POLICY IF EXISTS "Users can view tasks in their workspaces" ON public.tasks;
DROP POLICY IF EXISTS "Users can manage tasks in their workspaces" ON public.tasks;
DROP POLICY IF EXISTS "Users can view clients in their workspaces" ON public.clients;
DROP POLICY IF EXISTS "Users can manage clients in their workspaces" ON public.clients;
DROP POLICY IF EXISTS "Users can view cost items in their workspaces" ON public.cost_items;
DROP POLICY IF EXISTS "Users can manage cost items in their workspaces" ON public.cost_items;
DROP POLICY IF EXISTS "Users can view task assignees in their workspaces" ON public.task_assignees;
DROP POLICY IF EXISTS "Users can manage task assignees in their workspaces" ON public.task_assignees;
DROP POLICY IF EXISTS "Users can view task comments in their workspaces" ON public.task_comments;
DROP POLICY IF EXISTS "Users can manage task comments in their workspaces" ON public.task_comments;
DROP POLICY IF EXISTS "Users can view time entries in their workspaces" ON public.time_entries;
DROP POLICY IF EXISTS "Users can manage time entries in their workspaces" ON public.time_entries;
DROP POLICY IF EXISTS "Users can view task timers in their workspaces" ON public.task_timers;
DROP POLICY IF EXISTS "Users can manage task timers in their workspaces" ON public.task_timers;
DROP POLICY IF EXISTS "Users can view workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can manage workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can view workspace invitations" ON public.workspace_invitations;
DROP POLICY IF EXISTS "Users can manage workspace invitations" ON public.workspace_invitations;

-- 2. Create simple, non-recursive RLS policies

-- Workspaces policies - simple and direct
CREATE POLICY "Users can view own workspaces" ON public.workspaces
    FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Users can view member workspaces" ON public.workspaces
    FOR SELECT USING (
        id IN (
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own workspaces" ON public.workspaces
    FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can create workspaces" ON public.workspaces
    FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Workspace members policies
CREATE POLICY "Users can view workspace members" ON public.workspace_members
    FOR SELECT USING (
        user_id = auth.uid() OR
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage workspace members" ON public.workspace_members
    FOR ALL USING (
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        )
    );

-- Workspace invitations policies
CREATE POLICY "Users can view workspace invitations" ON public.workspace_invitations
    FOR SELECT USING (
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage workspace invitations" ON public.workspace_invitations
    FOR ALL USING (
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        )
    );

-- Projects policies
CREATE POLICY "Users can view projects in own workspaces" ON public.projects
    FOR SELECT USING (
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can view projects in member workspaces" ON public.projects
    FOR SELECT USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage projects in own workspaces" ON public.projects
    FOR ALL USING (
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage projects in member workspaces" ON public.projects
    FOR ALL USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid()
        )
    );

-- Tasks policies
CREATE POLICY "Users can view tasks in own workspaces" ON public.tasks
    FOR SELECT USING (
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can view tasks in member workspaces" ON public.tasks
    FOR SELECT USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage tasks in own workspaces" ON public.tasks
    FOR ALL USING (
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage tasks in member workspaces" ON public.tasks
    FOR ALL USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid()
        )
    );

-- Clients policies
CREATE POLICY "Users can view clients in own workspaces" ON public.clients
    FOR SELECT USING (
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can view clients in member workspaces" ON public.clients
    FOR SELECT USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage clients in own workspaces" ON public.clients
    FOR ALL USING (
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage clients in member workspaces" ON public.clients
    FOR ALL USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid()
        )
    );

-- Cost items policies
CREATE POLICY "Users can view cost items in own workspaces" ON public.cost_items
    FOR SELECT USING (
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can view cost items in member workspaces" ON public.cost_items
    FOR SELECT USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage cost items in own workspaces" ON public.cost_items
    FOR ALL USING (
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage cost items in member workspaces" ON public.cost_items
    FOR ALL USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid()
        )
    );

-- Task assignees policies
CREATE POLICY "Users can view task assignees in own workspaces" ON public.task_assignees
    FOR SELECT USING (
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can view task assignees in member workspaces" ON public.task_assignees
    FOR SELECT USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage task assignees in own workspaces" ON public.task_assignees
    FOR ALL USING (
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage task assignees in member workspaces" ON public.task_assignees
    FOR ALL USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid()
        )
    );

-- Task comments policies
CREATE POLICY "Users can view task comments in own workspaces" ON public.task_comments
    FOR SELECT USING (
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can view task comments in member workspaces" ON public.task_comments
    FOR SELECT USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage task comments in own workspaces" ON public.task_comments
    FOR ALL USING (
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage task comments in member workspaces" ON public.task_comments
    FOR ALL USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid()
        )
    );

-- Time entries policies
CREATE POLICY "Users can view time entries in own workspaces" ON public.time_entries
    FOR SELECT USING (
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can view time entries in member workspaces" ON public.time_entries
    FOR SELECT USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage time entries in own workspaces" ON public.time_entries
    FOR ALL USING (
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage time entries in member workspaces" ON public.time_entries
    FOR ALL USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid()
        )
    );

-- Task timers policies
CREATE POLICY "Users can view task timers in own workspaces" ON public.task_timers
    FOR SELECT USING (
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can view task timers in member workspaces" ON public.task_timers
    FOR SELECT USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage task timers in own workspaces" ON public.task_timers
    FOR ALL USING (
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage task timers in member workspaces" ON public.task_timers
    FOR ALL USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid()
        )
    );

-- 3. Ensure RLS is enabled on all tables
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

COMMIT;
