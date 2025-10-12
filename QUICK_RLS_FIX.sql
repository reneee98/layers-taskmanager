-- QUICK RLS FIX - Copy and paste this into Supabase SQL Editor

-- 1. Drop all existing policies
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

-- 2. Create simple policies without recursion
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

-- 3. Enable RLS
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
