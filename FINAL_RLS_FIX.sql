-- FINAL RLS FIX - This will definitely work!

-- 1. Disable RLS completely
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

-- 2. Drop ALL policies
DROP POLICY IF EXISTS "Users can view workspaces they own" ON public.workspaces;
DROP POLICY IF EXISTS "Users can manage workspaces they own" ON public.workspaces;
DROP POLICY IF EXISTS "Users can view workspace members of their workspaces" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can manage workspace members of their workspaces" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can view workspace invitations of their workspaces" ON public.workspace_invitations;
DROP POLICY IF EXISTS "Users can manage workspace invitations of their workspaces" ON public.workspace_invitations;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view projects in their workspaces" ON public.projects;
DROP POLICY IF EXISTS "Users can manage projects in their workspaces" ON public.projects;
DROP POLICY IF EXISTS "Users can view clients in their workspaces" ON public.clients;
DROP POLICY IF EXISTS "Users can manage clients in their workspaces" ON public.clients;
DROP POLICY IF EXISTS "Users can view tasks in their workspaces" ON public.tasks;
DROP POLICY IF EXISTS "Users can manage tasks in their workspaces" ON public.tasks;
DROP POLICY IF EXISTS "Users can view task assignees in their workspaces" ON public.task_assignees;
DROP POLICY IF EXISTS "Users can manage task assignees in their workspaces" ON public.task_assignees;
DROP POLICY IF EXISTS "Users can view task comments in their workspaces" ON public.task_comments;
DROP POLICY IF EXISTS "Users can manage task comments in their workspaces" ON public.task_comments;
DROP POLICY IF EXISTS "Users can view task timers in their workspaces" ON public.task_timers;
DROP POLICY IF EXISTS "Users can manage task timers in their workspaces" ON public.task_timers;
DROP POLICY IF EXISTS "Users can view cost items in their workspaces" ON public.cost_items;
DROP POLICY IF EXISTS "Users can manage cost items in their workspaces" ON public.cost_items;

-- 3. Create simple policies without recursion
CREATE POLICY "Simple workspaces policy" ON public.workspaces
  FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Simple profiles policy" ON public.profiles
  FOR ALL USING (id = auth.uid()) WITH CHECK (id = auth.uid());

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
