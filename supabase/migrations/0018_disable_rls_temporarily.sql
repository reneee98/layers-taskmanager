-- Temporarily disable RLS for testing

-- Disable RLS on task_assignees
ALTER TABLE public.task_assignees DISABLE ROW LEVEL SECURITY;

-- Disable RLS on users
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Disable RLS on project_members
ALTER TABLE public.project_members DISABLE ROW LEVEL SECURITY;
