-- EMERGENCY RLS FIX - Copy this into Supabase SQL Editor

-- 1. Disable RLS temporarily
ALTER TABLE public.workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_invitations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignees DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_timers DISABLE ROW LEVEL SECURITY;

-- 2. Drop ALL existing policies
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
DROP POLICY IF EXISTS "Users can manage task comments in their workspaces" ON public.tasks;
DROP POLICY IF EXISTS "Users can view time entries in their workspaces" ON public.time_entries;
DROP POLICY IF EXISTS "Users can manage time entries in their workspaces" ON public.time_entries;
DROP POLICY IF EXISTS "Users can view task timers in their workspaces" ON public.task_timers;
DROP POLICY IF EXISTS "Users can manage task timers in their workspaces" ON public.task_timers;
DROP POLICY IF EXISTS "Users can view workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can manage workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can view workspace invitations" ON public.workspace_invitations;
DROP POLICY IF EXISTS "Users can manage workspace invitations" ON public.workspace_invitations;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Owners can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow workspace members to view other profiles in their workspace" ON public.profiles;

-- 3. Create simple, non-recursive policies
CREATE POLICY "Simple workspace access" ON public.workspaces
    FOR ALL USING (true);

CREATE POLICY "Simple workspace members access" ON public.workspace_members
    FOR ALL USING (true);

CREATE POLICY "Simple workspace invitations access" ON public.workspace_invitations
    FOR ALL USING (true);

CREATE POLICY "Simple profiles access" ON public.profiles
    FOR ALL USING (true);

CREATE POLICY "Simple projects access" ON public.projects
    FOR ALL USING (true);

CREATE POLICY "Simple tasks access" ON public.tasks
    FOR ALL USING (true);

CREATE POLICY "Simple clients access" ON public.clients
    FOR ALL USING (true);

CREATE POLICY "Simple cost items access" ON public.cost_items
    FOR ALL USING (true);

CREATE POLICY "Simple task assignees access" ON public.task_assignees
    FOR ALL USING (true);

CREATE POLICY "Simple task comments access" ON public.task_comments
    FOR ALL USING (true);

CREATE POLICY "Simple time entries access" ON public.time_entries
    FOR ALL USING (true);

CREATE POLICY "Simple task timers access" ON public.task_timers
    FOR ALL USING (true);

-- 4. Re-enable RLS
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_timers ENABLE ROW LEVEL SECURITY;
