-- Add users table and assignee functionality

-- 1. Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'designer' CHECK (role IN ('owner', 'designer')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add assignee_id to tasks (single assignee)
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS assignee_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- 3. Create task_assignees table for multiple assignees
CREATE TABLE IF NOT EXISTS public.task_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  UNIQUE(task_id, user_id)
);

-- 4. Create project_members table for project-level assignments
CREATE TABLE IF NOT EXISTS public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'manager', 'member')),
  hourly_rate DECIMAL(10,2),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_task_id ON public.task_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_user_id ON public.task_assignees(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON public.project_members(user_id);

-- 6. Insert some sample users
INSERT INTO public.users (id, email, name, role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'design@renemoravec.sk', 'René Moravec', 'owner'),
  ('00000000-0000-0000-0000-000000000002', 'valentinabusova148@gmail.com', 'Valentina Busová', 'designer')
ON CONFLICT (email) DO NOTHING;

-- 7. Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies for users
CREATE POLICY "Users can view all users" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Only owners can insert users" ON public.users
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Only owners can update users" ON public.users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- 9. Create RLS policies for task_assignees
CREATE POLICY "Users can view task assignees" ON public.task_assignees
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      JOIN public.project_members pm ON pm.project_id = p.id
      WHERE t.id = task_assignees.task_id AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can assign tasks" ON public.task_assignees
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      JOIN public.project_members pm ON pm.project_id = p.id
      WHERE t.id = task_assignees.task_id AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can remove task assignments" ON public.task_assignees
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      JOIN public.project_members pm ON pm.project_id = p.id
      WHERE t.id = task_assignees.task_id AND pm.user_id = auth.uid()
    )
  );

-- 10. Create RLS policies for project_members
CREATE POLICY "Users can view project members" ON public.project_members
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.project_members pm2
      WHERE pm2.project_id = project_members.project_id 
      AND pm2.user_id = auth.uid()
    )
  );

CREATE POLICY "Project owners can manage members" ON public.project_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_members.project_id 
      AND pm.user_id = auth.uid() 
      AND pm.role IN ('owner', 'manager')
    )
  );
