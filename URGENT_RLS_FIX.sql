-- URGENT RLS FIX - Copy this into Supabase SQL Editor and run it NOW!

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
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow workspace members to view other profiles in their workspace" ON public.profiles;
DROP POLICY IF EXISTS "Allow workspace members to view projects" ON public.projects;
DROP POLICY IF EXISTS "Allow workspace owners to manage projects" ON public.projects;
DROP POLICY IF EXISTS "Allow workspace members to view clients" ON public.clients;
DROP POLICY IF EXISTS "Allow workspace owners to manage clients" ON public.clients;
DROP POLICY IF EXISTS "Allow workspace members to view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow workspace owners to manage tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow workspace members to view task assignees" ON public.task_assignees;
DROP POLICY IF EXISTS "Allow workspace owners to manage task assignees" ON public.task_assignees;
DROP POLICY IF EXISTS "Allow workspace members to view task comments" ON public.task_comments;
DROP POLICY IF EXISTS "Allow workspace owners to manage task comments" ON public.task_comments;
DROP POLICY IF EXISTS "Allow workspace members to view task timers" ON public.task_timers;
DROP POLICY IF EXISTS "Allow workspace owners to manage task timers" ON public.task_timers;
DROP POLICY IF EXISTS "Allow workspace members to view cost items" ON public.cost_items;
DROP POLICY IF EXISTS "Allow workspace owners to manage cost items" ON public.cost_items;

-- 3. Create simple, non-recursive policies
CREATE POLICY "Users can view workspaces they own" ON public.workspaces
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Users can manage workspaces they own" ON public.workspaces
  FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can view workspace members of their workspaces" ON public.workspace_members
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_members.workspace_id AND w.owner_id = auth.uid()));

CREATE POLICY "Users can manage workspace members of their workspaces" ON public.workspace_members
  FOR ALL USING (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_members.workspace_id AND w.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_members.workspace_id AND w.owner_id = auth.uid()));

CREATE POLICY "Users can view workspace invitations of their workspaces" ON public.workspace_invitations
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_invitations.workspace_id AND w.owner_id = auth.uid()));

CREATE POLICY "Users can manage workspace invitations of their workspaces" ON public.workspace_invitations
  FOR ALL USING (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_invitations.workspace_id AND w.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_invitations.workspace_id AND w.owner_id = auth.uid()));

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view projects in their workspaces" ON public.projects
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = projects.workspace_id AND w.owner_id = auth.uid()));

CREATE POLICY "Users can manage projects in their workspaces" ON public.projects
  FOR ALL USING (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = projects.workspace_id AND w.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = projects.workspace_id AND w.owner_id = auth.uid()));

CREATE POLICY "Users can view clients in their workspaces" ON public.clients
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = clients.workspace_id AND w.owner_id = auth.uid()));

CREATE POLICY "Users can manage clients in their workspaces" ON public.clients
  FOR ALL USING (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = clients.workspace_id AND w.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = clients.workspace_id AND w.owner_id = auth.uid()));

CREATE POLICY "Users can view tasks in their workspaces" ON public.tasks
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = tasks.workspace_id AND w.owner_id = auth.uid()));

CREATE POLICY "Users can manage tasks in their workspaces" ON public.tasks
  FOR ALL USING (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = tasks.workspace_id AND w.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = tasks.workspace_id AND w.owner_id = auth.uid()));

CREATE POLICY "Users can view task assignees in their workspaces" ON public.task_assignees
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = task_assignees.workspace_id AND w.owner_id = auth.uid()));

CREATE POLICY "Users can manage task assignees in their workspaces" ON public.task_assignees
  FOR ALL USING (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = task_assignees.workspace_id AND w.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = task_assignees.workspace_id AND w.owner_id = auth.uid()));

CREATE POLICY "Users can view task comments in their workspaces" ON public.task_comments
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = task_comments.workspace_id AND w.owner_id = auth.uid()));

CREATE POLICY "Users can manage task comments in their workspaces" ON public.task_comments
  FOR ALL USING (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = task_comments.workspace_id AND w.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = task_comments.workspace_id AND w.owner_id = auth.uid()));

CREATE POLICY "Users can view task timers in their workspaces" ON public.task_timers
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = task_timers.workspace_id AND w.owner_id = auth.uid()));

CREATE POLICY "Users can manage task timers in their workspaces" ON public.task_timers
  FOR ALL USING (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = task_timers.workspace_id AND w.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = task_timers.workspace_id AND w.owner_id = auth.uid()));

CREATE POLICY "Users can view cost items in their workspaces" ON public.cost_items
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = cost_items.workspace_id AND w.owner_id = auth.uid()));

CREATE POLICY "Users can manage cost items in their workspaces" ON public.cost_items
  FOR ALL USING (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = cost_items.workspace_id AND w.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = cost_items.workspace_id AND w.owner_id = auth.uid()));

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
