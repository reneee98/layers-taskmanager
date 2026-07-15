-- Layers Studio schema export
-- Generated: 2026-07-15 18:38:21 CEST
-- Source: supabase/migrations/*.sql
-- Note: this file contains schema migrations from the repository, not a live data dump.


-- ============================================
-- FILE: supabase/migrations/0004_add_google_drive_link_to_tasks_clean.sql
-- ============================================

-- Add google_drive_link column to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS google_drive_link TEXT;

-- Add comment for documentation
COMMENT ON COLUMN tasks.google_drive_link IS 'Google Drive link for task files and documents';

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tasks' 
  AND column_name = 'google_drive_link';


-- ============================================
-- FILE: supabase/migrations/0005_add_sent_to_client_status.sql
-- ============================================

-- Migration: Add 'sent_to_client' status to task_status enum
-- Purpose: Allow tasks to be marked as sent to client

-- Add 'sent_to_client' to the existing task_status enum
ALTER TYPE task_status ADD VALUE 'sent_to_client';

-- Add comment for documentation
COMMENT ON TYPE task_status IS 'Task status enum: todo, in_progress, review, sent_to_client, done, cancelled';

-- Verify the enum was updated
SELECT unnest(enum_range(NULL::task_status)) as task_status_values;


-- ============================================
-- FILE: supabase/migrations/0006_create_activities_table_simple.sql
-- ============================================

-- Migration: Create activities table for real-time activity logging (Simple version)
-- Purpose: Store user activities in real-time for better tracking

-- Create activities table without foreign key constraints first
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  user_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL,
  action VARCHAR(100) NOT NULL,
  details TEXT,
  project_id UUID,
  task_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_activities_workspace_id ON activities(workspace_id);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_project_id ON activities(project_id);
CREATE INDEX IF NOT EXISTS idx_activities_task_id ON activities(task_id);

-- Add comments for documentation
COMMENT ON TABLE activities IS 'Real-time activity log for user actions';
COMMENT ON COLUMN activities.type IS 'Type of activity: task_created, task_updated, task_completed, time_added, comment_added, etc.';
COMMENT ON COLUMN activities.action IS 'Human-readable action description';
COMMENT ON COLUMN activities.details IS 'Additional details like task title, description';
COMMENT ON COLUMN activities.metadata IS 'JSON data with additional context like old/new values, status changes';

-- Verify the table was created
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'activities' 
ORDER BY ordinal_position;


-- ============================================
-- FILE: supabase/migrations/0007_enable_rls_and_permissions.sql
-- ============================================

-- Migration: Enable RLS and create permissions for workspace members
-- Purpose: Allow all workspace members to manage tasks, while maintaining security

-- Enable RLS on tasks table
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Workspace members can view tasks" ON tasks;
DROP POLICY IF EXISTS "Workspace members can insert tasks" ON tasks;
DROP POLICY IF EXISTS "Workspace members can update tasks" ON tasks;
DROP POLICY IF EXISTS "Workspace members can delete tasks" ON tasks;

-- Create comprehensive RLS policies for tasks

-- 1. View tasks: All workspace members can view tasks in their workspace
CREATE POLICY "Workspace members can view tasks" ON tasks
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- 2. Insert tasks: All workspace members can create tasks in their workspace
CREATE POLICY "Workspace members can insert tasks" ON tasks
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- 3. Update tasks: All workspace members can update tasks in their workspace
CREATE POLICY "Workspace members can update tasks" ON tasks
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  ) WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- 4. Delete tasks: All workspace members can delete tasks in their workspace
CREATE POLICY "Workspace members can delete tasks" ON tasks
  FOR DELETE USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Enable RLS on other related tables
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- Time entries policies
DROP POLICY IF EXISTS "Workspace members can view time entries" ON time_entries;
DROP POLICY IF EXISTS "Workspace members can insert time entries" ON time_entries;
DROP POLICY IF EXISTS "Workspace members can update time entries" ON time_entries;
DROP POLICY IF EXISTS "Workspace members can delete time entries" ON time_entries;

CREATE POLICY "Workspace members can view time entries" ON time_entries
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can insert time entries" ON time_entries
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can update time entries" ON time_entries
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  ) WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can delete time entries" ON time_entries
  FOR DELETE USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Task assignees policies
DROP POLICY IF EXISTS "Workspace members can view task assignees" ON task_assignees;
DROP POLICY IF EXISTS "Workspace members can insert task assignees" ON task_assignees;
DROP POLICY IF EXISTS "Workspace members can update task assignees" ON task_assignees;
DROP POLICY IF EXISTS "Workspace members can delete task assignees" ON task_assignees;

CREATE POLICY "Workspace members can view task assignees" ON task_assignees
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can insert task assignees" ON task_assignees
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can update task assignees" ON task_assignees
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  ) WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can delete task assignees" ON task_assignees
  FOR DELETE USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Task comments policies
DROP POLICY IF EXISTS "Workspace members can view task comments" ON task_comments;
DROP POLICY IF EXISTS "Workspace members can insert task comments" ON task_comments;
DROP POLICY IF EXISTS "Workspace members can update task comments" ON task_comments;
DROP POLICY IF EXISTS "Workspace members can delete task comments" ON task_comments;

CREATE POLICY "Workspace members can view task comments" ON task_comments
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can insert task comments" ON task_comments
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can update task comments" ON task_comments
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  ) WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can delete task comments" ON task_comments
  FOR DELETE USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Add comments for documentation
COMMENT ON TABLE tasks IS 'Tasks table with RLS enabled - all workspace members can manage tasks';
COMMENT ON TABLE time_entries IS 'Time entries table with RLS enabled - all workspace members can manage time entries';
COMMENT ON TABLE task_assignees IS 'Task assignees table with RLS enabled - all workspace members can manage assignees';
COMMENT ON TABLE task_comments IS 'Task comments table with RLS enabled - all workspace members can manage comments';

-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('tasks', 'time_entries', 'task_assignees', 'task_comments')
  AND schemaname = 'public';


-- ============================================
-- FILE: supabase/migrations/0008_fix_rls_permissions.sql
-- ============================================

-- Migration: Fix RLS permissions for workspace members
-- Purpose: Allow workspace owners and members to see all data

-- First, disable RLS temporarily to check data
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignees DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;

-- Check current data
SELECT 'Tasks count:' as table_name, COUNT(*) as count FROM tasks WHERE workspace_id = '6dd7d31a-3d36-4d92-a8eb-7146703a00b0'
UNION ALL
SELECT 'Projects count:', COUNT(*) FROM projects WHERE workspace_id = '6dd7d31a-3d36-4d92-a8eb-7146703a00b0'
UNION ALL
SELECT 'Clients count:', COUNT(*) FROM clients WHERE workspace_id = '6dd7d31a-3d36-4d92-a8eb-7146703a00b0'
UNION ALL
SELECT 'Time entries count:', COUNT(*) FROM time_entries WHERE workspace_id = '6dd7d31a-3d36-4d92-a8eb-7146703a00b0';

-- Check workspace members
SELECT 'Workspace members:' as info, COUNT(*) as count FROM workspace_members WHERE workspace_id = '6dd7d31a-3d36-4d92-a8eb-7146703a00b0';

-- Check profiles
SELECT 'Profiles count:' as info, COUNT(*) as count FROM profiles;

-- Re-enable RLS with proper policies
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Workspace members can view tasks" ON tasks;
DROP POLICY IF EXISTS "Workspace members can insert tasks" ON tasks;
DROP POLICY IF EXISTS "Workspace members can update tasks" ON tasks;
DROP POLICY IF EXISTS "Workspace members can delete tasks" ON tasks;

DROP POLICY IF EXISTS "Workspace members can view time entries" ON time_entries;
DROP POLICY IF EXISTS "Workspace members can insert time entries" ON time_entries;
DROP POLICY IF EXISTS "Workspace members can update time entries" ON time_entries;
DROP POLICY IF EXISTS "Workspace members can delete time entries" ON time_entries;

DROP POLICY IF EXISTS "Workspace members can view task assignees" ON task_assignees;
DROP POLICY IF EXISTS "Workspace members can insert task assignees" ON task_assignees;
DROP POLICY IF EXISTS "Workspace members can update task assignees" ON task_assignees;
DROP POLICY IF EXISTS "Workspace members can delete task assignees" ON task_assignees;

DROP POLICY IF EXISTS "Workspace members can view task comments" ON task_comments;
DROP POLICY IF EXISTS "Workspace members can insert task comments" ON task_comments;
DROP POLICY IF EXISTS "Workspace members can update task comments" ON task_comments;
DROP POLICY IF EXISTS "Workspace members can delete task comments" ON task_comments;

-- Create simple policies that allow all workspace members to do everything

-- Tasks policies
CREATE POLICY "Workspace members can manage tasks" ON tasks
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Time entries policies
CREATE POLICY "Workspace members can manage time entries" ON time_entries
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Task assignees policies
CREATE POLICY "Workspace members can manage task assignees" ON task_assignees
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Task comments policies
CREATE POLICY "Workspace members can manage task comments" ON task_comments
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Projects policies
CREATE POLICY "Workspace members can manage projects" ON projects
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Clients policies
CREATE POLICY "Workspace members can manage clients" ON clients
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Add comments for documentation
COMMENT ON TABLE tasks IS 'Tasks table with RLS enabled - all workspace members can manage tasks';
COMMENT ON TABLE time_entries IS 'Time entries table with RLS enabled - all workspace members can manage time entries';
COMMENT ON TABLE task_assignees IS 'Task assignees table with RLS enabled - all workspace members can manage assignees';
COMMENT ON TABLE task_comments IS 'Task comments table with RLS enabled - all workspace members can manage comments';
COMMENT ON TABLE projects IS 'Projects table with RLS enabled - all workspace members can manage projects';
COMMENT ON TABLE clients IS 'Clients table with RLS enabled - all workspace members can manage clients';

-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('tasks', 'time_entries', 'task_assignees', 'task_comments', 'projects', 'clients')
  AND schemaname = 'public';


-- ============================================
-- FILE: supabase/migrations/0009_setup_roles_and_permissions.sql
-- ============================================

-- Migration: Setup roles and permissions
-- Purpose: Majiteľ vidí všetko, Člen vidí len projekty a klientov bez cien

-- First, disable RLS temporarily to check data
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignees DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;

-- Check current data
SELECT 'Tasks count:' as table_name, COUNT(*) as count FROM tasks WHERE workspace_id = '6dd7d31a-3d36-4d92-a8eb-7146703a00b0'
UNION ALL
SELECT 'Projects count:', COUNT(*) FROM projects WHERE workspace_id = '6dd7d31a-3d36-4d92-a8eb-7146703a00b0'
UNION ALL
SELECT 'Clients count:', COUNT(*) FROM clients WHERE workspace_id = '6dd7d31a-3d36-4d92-a8eb-7146703a00b0'
UNION ALL
SELECT 'Time entries count:', COUNT(*) FROM time_entries WHERE workspace_id = '6dd7d31a-3d36-4d92-a8eb-7146703a00b0';

-- Check workspace members and their roles
SELECT 'Workspace members:' as info, COUNT(*) as count FROM workspace_members WHERE workspace_id = '6dd7d31a-3d36-4d92-a8eb-7146703a00b0';

-- Check current roles
SELECT wm.user_id, p.email, p.display_name, p.role as profile_role, wm.role as workspace_role
FROM workspace_members wm
JOIN profiles p ON wm.user_id = p.id
WHERE wm.workspace_id = '6dd7d31a-3d36-4d92-a8eb-7146703a00b0';

-- Re-enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Workspace members can manage tasks" ON tasks;
DROP POLICY IF EXISTS "Workspace members can manage time entries" ON time_entries;
DROP POLICY IF EXISTS "Workspace members can manage task assignees" ON task_assignees;
DROP POLICY IF EXISTS "Workspace members can manage task comments" ON task_comments;
DROP POLICY IF EXISTS "Workspace members can manage projects" ON projects;
DROP POLICY IF EXISTS "Workspace members can manage clients" ON clients;

-- Create helper function to check if user is owner
CREATE OR REPLACE FUNCTION is_workspace_owner(workspace_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspaces 
    WHERE id = workspace_id AND owner_id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to check if user is member
CREATE OR REPLACE FUNCTION is_workspace_member(workspace_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_id = workspace_id AND user_id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- TASKS: Only owners can see and manage tasks
CREATE POLICY "Owners can manage tasks" ON tasks
  FOR ALL USING (
    is_workspace_owner(workspace_id, auth.uid())
  );

-- TIME ENTRIES: Only owners can see and manage time entries
CREATE POLICY "Owners can manage time entries" ON time_entries
  FOR ALL USING (
    is_workspace_owner(workspace_id, auth.uid())
  );

-- TASK ASSIGNEES: Only owners can see and manage task assignees
CREATE POLICY "Owners can manage task assignees" ON task_assignees
  FOR ALL USING (
    is_workspace_owner(workspace_id, auth.uid())
  );

-- TASK COMMENTS: Only owners can see and manage task comments
CREATE POLICY "Owners can manage task comments" ON task_comments
  FOR ALL USING (
    is_workspace_owner(workspace_id, auth.uid())
  );

-- PROJECTS: Both owners and members can see projects
-- Owners see everything, members see without prices
CREATE POLICY "Owners can manage projects" ON projects
  FOR ALL USING (
    is_workspace_owner(workspace_id, auth.uid())
  );

CREATE POLICY "Members can view projects" ON projects
  FOR SELECT USING (
    is_workspace_member(workspace_id, auth.uid())
  );

-- CLIENTS: Both owners and members can see clients
-- Owners see everything, members see without prices
CREATE POLICY "Owners can manage clients" ON clients
  FOR ALL USING (
    is_workspace_owner(workspace_id, auth.uid())
  );

CREATE POLICY "Members can view clients" ON clients
  FOR SELECT USING (
    is_workspace_member(workspace_id, auth.uid())
  );

-- Create views for members (without sensitive data)

-- Projects view for members (without prices)
CREATE OR REPLACE VIEW member_projects_view AS
SELECT 
  id,
  name,
  description,
  status,
  start_date,
  end_date,
  client_id,
  workspace_id,
  created_at,
  updated_at
FROM projects
WHERE workspace_id IN (
  SELECT workspace_id 
  FROM workspace_members 
  WHERE user_id = auth.uid()
);

-- Clients view for members (without prices)
CREATE OR REPLACE VIEW member_clients_view AS
SELECT 
  id,
  name,
  email,
  phone,
  address,
  workspace_id,
  created_at,
  updated_at
FROM clients
WHERE workspace_id IN (
  SELECT workspace_id 
  FROM workspace_members 
  WHERE user_id = auth.uid()
);

-- Grant access to views
GRANT SELECT ON member_projects_view TO authenticated;
GRANT SELECT ON member_clients_view TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE tasks IS 'Tasks table - only workspace owners can manage';
COMMENT ON TABLE time_entries IS 'Time entries table - only workspace owners can manage';
COMMENT ON TABLE task_assignees IS 'Task assignees table - only workspace owners can manage';
COMMENT ON TABLE task_comments IS 'Task comments table - only workspace owners can manage';
COMMENT ON TABLE projects IS 'Projects table - owners can manage, members can view';
COMMENT ON TABLE clients IS 'Clients table - owners can manage, members can view';
COMMENT ON VIEW member_projects_view IS 'Projects view for members - without prices';
COMMENT ON VIEW member_clients_view IS 'Clients view for members - without prices';

-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('tasks', 'time_entries', 'task_assignees', 'task_comments', 'projects', 'clients')
  AND schemaname = 'public';


-- ============================================
-- FILE: supabase/migrations/0010_user_management_permissions.sql
-- ============================================

-- Migration: User management permissions
-- Purpose: Only workspace owners can manage users and their roles

-- Enable RLS on profiles and workspace_members tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Owners can manage all profiles" ON profiles;

DROP POLICY IF EXISTS "Workspace members can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Workspace members can insert workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Workspace members can update workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Workspace members can delete workspace members" ON workspace_members;

-- PROFILES policies
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile (but not role)
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id) 
  WITH CHECK (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Only workspace owners can manage all profiles (including roles)
CREATE POLICY "Owners can manage all profiles" ON profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workspaces 
      WHERE owner_id = auth.uid()
    )
  );

-- WORKSPACE_MEMBERS policies
-- Only workspace owners can manage workspace members
CREATE POLICY "Owners can manage workspace members" ON workspace_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workspaces 
      WHERE id = workspace_id AND owner_id = auth.uid()
    )
  );

-- Members can view workspace members in their workspaces
CREATE POLICY "Members can view workspace members" ON workspace_members
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Create helper function to check if user can manage workspace
CREATE OR REPLACE FUNCTION can_manage_workspace(workspace_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspaces 
    WHERE id = workspace_id AND owner_id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to add user to workspace (only for owners)
CREATE OR REPLACE FUNCTION add_user_to_workspace(
  p_workspace_id UUID,
  p_user_id UUID,
  p_role TEXT DEFAULT 'member'
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if current user is owner of the workspace
  IF NOT can_manage_workspace(p_workspace_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only workspace owners can add users';
  END IF;
  
  -- Insert user into workspace
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (p_workspace_id, p_user_id, p_role)
  ON CONFLICT (workspace_id, user_id) 
  DO UPDATE SET role = p_role;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to remove user from workspace (only for owners)
CREATE OR REPLACE FUNCTION remove_user_from_workspace(
  p_workspace_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if current user is owner of the workspace
  IF NOT can_manage_workspace(p_workspace_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only workspace owners can remove users';
  END IF;
  
  -- Don't allow removing the owner
  IF EXISTS (SELECT 1 FROM workspaces WHERE id = p_workspace_id AND owner_id = p_user_id) THEN
    RAISE EXCEPTION 'Cannot remove workspace owner';
  END IF;
  
  -- Remove user from workspace
  DELETE FROM workspace_members 
  WHERE workspace_id = p_workspace_id AND user_id = p_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update user role (only for owners)
CREATE OR REPLACE FUNCTION update_user_role(
  p_workspace_id UUID,
  p_user_id UUID,
  p_role TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if current user is owner of the workspace
  IF NOT can_manage_workspace(p_workspace_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only workspace owners can update user roles';
  END IF;
  
  -- Don't allow changing owner role
  IF EXISTS (SELECT 1 FROM workspaces WHERE id = p_workspace_id AND owner_id = p_user_id) THEN
    RAISE EXCEPTION 'Cannot change workspace owner role';
  END IF;
  
  -- Update user role
  UPDATE workspace_members 
  SET role = p_role
  WHERE workspace_id = p_workspace_id AND user_id = p_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION add_user_to_workspace(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_user_from_workspace(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_role(UUID, UUID, TEXT) TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE profiles IS 'Profiles table - users can manage own profile, owners can manage all';
COMMENT ON TABLE workspace_members IS 'Workspace members table - only owners can manage members';
COMMENT ON FUNCTION add_user_to_workspace IS 'Add user to workspace - only for workspace owners';
COMMENT ON FUNCTION remove_user_from_workspace IS 'Remove user from workspace - only for workspace owners';
COMMENT ON FUNCTION update_user_role IS 'Update user role - only for workspace owners';

-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('profiles', 'workspace_members')
  AND schemaname = 'public';


-- ============================================
-- FILE: supabase/migrations/0011_fix_workspaces_rls.sql
-- ============================================

-- Migration: Fix workspaces RLS policies
-- Purpose: Allow users to access their workspaces

-- Check current RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'workspaces' AND schemaname = 'public';

-- Check existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'workspaces' AND schemaname = 'public';

-- Enable RLS on workspaces if not already enabled
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can update own workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can delete own workspaces" ON workspaces;

-- Create policies for workspaces
-- Users can view workspaces they own or are members of
CREATE POLICY "Users can view accessible workspaces" ON workspaces
  FOR SELECT USING (
    owner_id = auth.uid() OR
    id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Users can create workspaces (they become owner)
CREATE POLICY "Users can create workspaces" ON workspaces
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Users can update workspaces they own
CREATE POLICY "Users can update own workspaces" ON workspaces
  FOR UPDATE USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Users can delete workspaces they own
CREATE POLICY "Users can delete own workspaces" ON workspaces
  FOR DELETE USING (owner_id = auth.uid());

-- Check if workspaces exist
SELECT COUNT(*) as workspace_count FROM workspaces;

-- Check if user has any workspaces
SELECT 'User workspaces:' as info, COUNT(*) as count 
FROM workspaces 
WHERE owner_id = '6dd7d31a-3d36-4d92-a8eb-7146703a00b0';

-- Add comment for documentation
COMMENT ON TABLE workspaces IS 'Workspaces table with RLS enabled - users can access their own workspaces';

-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'workspaces' AND schemaname = 'public';


-- ============================================
-- FILE: supabase/migrations/0012_fix_profiles_rls.sql
-- ============================================

-- Migration: Fix profiles RLS policies
-- Purpose: Allow users to access their profiles and fix 500 errors

-- Check current RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'profiles' AND schemaname = 'public';

-- Check existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'profiles' AND schemaname = 'public';

-- Enable RLS on profiles if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Owners can manage all profiles" ON profiles;

-- Create simple policies for profiles
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id) 
  WITH CHECK (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Workspace owners can view all profiles in their workspaces
CREATE POLICY "Owners can view workspace profiles" ON profiles
  FOR SELECT USING (
    id IN (
      SELECT user_id 
      FROM workspace_members 
      WHERE workspace_id IN (
        SELECT id 
        FROM workspaces 
        WHERE owner_id = auth.uid()
      )
    )
  );

-- Check if profiles exist
SELECT COUNT(*) as profile_count FROM profiles;

-- Check if user profile exists
SELECT 'User profile exists:' as info, COUNT(*) as count 
FROM profiles 
WHERE id = '775560ca-adfa-4df2-9768-6ea553494e1f';

-- Add comment for documentation
COMMENT ON TABLE profiles IS 'Profiles table with RLS enabled - users can manage own profile, owners can view workspace profiles';

-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'profiles' AND schemaname = 'public';


-- ============================================
-- FILE: supabase/migrations/0014_user_role_management.sql
-- ============================================

-- Migration: User role management functions
-- Purpose: Allow workspace owners to change user roles

-- Create function to update user role in workspace
CREATE OR REPLACE FUNCTION update_user_workspace_role(
  p_workspace_id UUID,
  p_user_id UUID,
  p_new_role TEXT
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- Check if current user is owner of the workspace
  IF NOT EXISTS (
    SELECT 1 FROM workspaces 
    WHERE id = p_workspace_id AND owner_id = auth.uid()
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Only workspace owners can change user roles'
    );
  END IF;
  
  -- Don't allow changing owner role
  IF EXISTS (
    SELECT 1 FROM workspaces 
    WHERE id = p_workspace_id AND owner_id = p_user_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cannot change workspace owner role'
    );
  END IF;
  
  -- Check if user is member of workspace
  IF NOT EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_id = p_workspace_id AND user_id = p_user_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User is not a member of this workspace'
    );
  END IF;
  
  -- Update user role
  UPDATE workspace_members 
  SET role = p_new_role, updated_at = NOW()
  WHERE workspace_id = p_workspace_id AND user_id = p_user_id;
  
  -- Return success
  RETURN json_build_object(
    'success', true,
    'message', 'User role updated successfully',
    'user_id', p_user_id,
    'new_role', p_new_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get workspace members with their roles
CREATE OR REPLACE FUNCTION get_workspace_members(p_workspace_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- Check if current user has access to workspace
  IF NOT EXISTS (
    SELECT 1 FROM workspaces 
    WHERE id = p_workspace_id AND (
      owner_id = auth.uid() OR
      id IN (
        SELECT workspace_id 
        FROM workspace_members 
        WHERE user_id = auth.uid()
      )
    )
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Access denied to this workspace'
    );
  END IF;
  
  -- Get workspace members
  SELECT json_build_object(
    'success', true,
    'data', json_agg(
      json_build_object(
        'user_id', wm.user_id,
        'role', wm.role,
        'email', p.email,
        'display_name', p.display_name,
        'is_owner', (w.owner_id = wm.user_id),
        'joined_at', wm.created_at
      )
    )
  ) INTO result
  FROM workspace_members wm
  JOIN profiles p ON wm.user_id = p.id
  JOIN workspaces w ON wm.workspace_id = w.id
  WHERE wm.workspace_id = p_workspace_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to add user to workspace with role
CREATE OR REPLACE FUNCTION add_user_to_workspace_with_role(
  p_workspace_id UUID,
  p_user_email TEXT,
  p_role TEXT DEFAULT 'member'
)
RETURNS JSON AS $$
DECLARE
  target_user_id UUID;
  result JSON;
BEGIN
  -- Check if current user is owner of the workspace
  IF NOT EXISTS (
    SELECT 1 FROM workspaces 
    WHERE id = p_workspace_id AND owner_id = auth.uid()
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Only workspace owners can add users'
    );
  END IF;
  
  -- Find user by email
  SELECT id INTO target_user_id
  FROM profiles
  WHERE email = p_user_email;
  
  IF target_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User with this email not found'
    );
  END IF;
  
  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_id = p_workspace_id AND user_id = target_user_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User is already a member of this workspace'
    );
  END IF;
  
  -- Add user to workspace
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (p_workspace_id, target_user_id, p_role);
  
  -- Return success
  RETURN json_build_object(
    'success', true,
    'message', 'User added to workspace successfully',
    'user_id', target_user_id,
    'email', p_user_email,
    'role', p_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to remove user from workspace
CREATE OR REPLACE FUNCTION remove_user_from_workspace(
  p_workspace_id UUID,
  p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- Check if current user is owner of the workspace
  IF NOT EXISTS (
    SELECT 1 FROM workspaces 
    WHERE id = p_workspace_id AND owner_id = auth.uid()
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Only workspace owners can remove users'
    );
  END IF;
  
  -- Don't allow removing the owner
  IF EXISTS (
    SELECT 1 FROM workspaces 
    WHERE id = p_workspace_id AND owner_id = p_user_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cannot remove workspace owner'
    );
  END IF;
  
  -- Remove user from workspace
  DELETE FROM workspace_members 
  WHERE workspace_id = p_workspace_id AND user_id = p_user_id;
  
  -- Return success
  RETURN json_build_object(
    'success', true,
    'message', 'User removed from workspace successfully',
    'user_id', p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION update_user_workspace_role(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_workspace_members(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION add_user_to_workspace_with_role(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_user_from_workspace(UUID, UUID) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION update_user_workspace_role IS 'Update user role in workspace - only for workspace owners';
COMMENT ON FUNCTION get_workspace_members IS 'Get workspace members with their roles - for workspace owners and members';
COMMENT ON FUNCTION add_user_to_workspace_with_role IS 'Add user to workspace with specific role - only for workspace owners';
COMMENT ON FUNCTION remove_user_from_workspace IS 'Remove user from workspace - only for workspace owners';

-- Test the functions
SELECT 'Functions created successfully' as status;


-- ============================================
-- FILE: supabase/migrations/0015_fix_existing_functions.sql
-- ============================================

-- Migration: Fix existing functions
-- Purpose: Drop existing functions and recreate with correct return types

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS remove_user_from_workspace(UUID, UUID);
DROP FUNCTION IF EXISTS add_user_to_workspace(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS update_user_role(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS add_user_to_workspace_with_role(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS update_user_workspace_role(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS get_workspace_members(UUID);

-- Recreate functions with correct return types

-- Create function to update user role in workspace
CREATE OR REPLACE FUNCTION update_user_workspace_role(
  p_workspace_id UUID,
  p_user_id UUID,
  p_new_role TEXT
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- Check if current user is owner of the workspace
  IF NOT EXISTS (
    SELECT 1 FROM workspaces 
    WHERE id = p_workspace_id AND owner_id = auth.uid()
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Only workspace owners can change user roles'
    );
  END IF;
  
  -- Don't allow changing owner role
  IF EXISTS (
    SELECT 1 FROM workspaces 
    WHERE id = p_workspace_id AND owner_id = p_user_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cannot change workspace owner role'
    );
  END IF;
  
  -- Check if user is member of workspace
  IF NOT EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_id = p_workspace_id AND user_id = p_user_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User is not a member of this workspace'
    );
  END IF;
  
  -- Update user role
  UPDATE workspace_members 
  SET role = p_new_role, updated_at = NOW()
  WHERE workspace_id = p_workspace_id AND user_id = p_user_id;
  
  -- Return success
  RETURN json_build_object(
    'success', true,
    'message', 'User role updated successfully',
    'user_id', p_user_id,
    'new_role', p_new_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get workspace members with their roles
CREATE OR REPLACE FUNCTION get_workspace_members(p_workspace_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- Check if current user has access to workspace
  IF NOT EXISTS (
    SELECT 1 FROM workspaces 
    WHERE id = p_workspace_id AND (
      owner_id = auth.uid() OR
      id IN (
        SELECT workspace_id 
        FROM workspace_members 
        WHERE user_id = auth.uid()
      )
    )
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Access denied to this workspace'
    );
  END IF;
  
  -- Get workspace members
  SELECT json_build_object(
    'success', true,
    'data', json_agg(
      json_build_object(
        'user_id', wm.user_id,
        'role', wm.role,
        'email', p.email,
        'display_name', p.display_name,
        'is_owner', (w.owner_id = wm.user_id),
        'joined_at', wm.created_at
      )
    )
  ) INTO result
  FROM workspace_members wm
  JOIN profiles p ON wm.user_id = p.id
  JOIN workspaces w ON wm.workspace_id = w.id
  WHERE wm.workspace_id = p_workspace_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to add user to workspace with role
CREATE OR REPLACE FUNCTION add_user_to_workspace_with_role(
  p_workspace_id UUID,
  p_user_email TEXT,
  p_role TEXT DEFAULT 'member'
)
RETURNS JSON AS $$
DECLARE
  target_user_id UUID;
  result JSON;
BEGIN
  -- Check if current user is owner of the workspace
  IF NOT EXISTS (
    SELECT 1 FROM workspaces 
    WHERE id = p_workspace_id AND owner_id = auth.uid()
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Only workspace owners can add users'
    );
  END IF;
  
  -- Find user by email
  SELECT id INTO target_user_id
  FROM profiles
  WHERE email = p_user_email;
  
  IF target_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User with this email not found'
    );
  END IF;
  
  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_id = p_workspace_id AND user_id = target_user_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User is already a member of this workspace'
    );
  END IF;
  
  -- Add user to workspace
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (p_workspace_id, target_user_id, p_role);
  
  -- Return success
  RETURN json_build_object(
    'success', true,
    'message', 'User added to workspace successfully',
    'user_id', target_user_id,
    'email', p_user_email,
    'role', p_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to remove user from workspace
CREATE OR REPLACE FUNCTION remove_user_from_workspace(
  p_workspace_id UUID,
  p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- Check if current user is owner of the workspace
  IF NOT EXISTS (
    SELECT 1 FROM workspaces 
    WHERE id = p_workspace_id AND owner_id = auth.uid()
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Only workspace owners can remove users'
    );
  END IF;
  
  -- Don't allow removing the owner
  IF EXISTS (
    SELECT 1 FROM workspaces 
    WHERE id = p_workspace_id AND owner_id = p_user_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cannot remove workspace owner'
    );
  END IF;
  
  -- Remove user from workspace
  DELETE FROM workspace_members 
  WHERE workspace_id = p_workspace_id AND user_id = p_user_id;
  
  -- Return success
  RETURN json_build_object(
    'success', true,
    'message', 'User removed from workspace successfully',
    'user_id', p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION update_user_workspace_role(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_workspace_members(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION add_user_to_workspace_with_role(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_user_from_workspace(UUID, UUID) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION update_user_workspace_role IS 'Update user role in workspace - only for workspace owners';
COMMENT ON FUNCTION get_workspace_members IS 'Get workspace members with their roles - for workspace owners and members';
COMMENT ON FUNCTION add_user_to_workspace_with_role IS 'Add user to workspace with specific role - only for workspace owners';
COMMENT ON FUNCTION remove_user_from_workspace IS 'Remove user from workspace - only for workspace owners';

-- Test the functions
SELECT 'Functions recreated successfully' as status;


-- ============================================
-- FILE: supabase/migrations/0018_simple_invoice_restriction.sql
-- ============================================

-- Migration: Simple invoice access restriction
-- Purpose: Only workspace owners can access invoices

-- First, check what tables exist
SELECT 'Existing tables:' as info, table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%invoice%'
ORDER BY table_name;

-- Check if invoices table exists and add workspace_id if needed
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices' AND table_schema = 'public') THEN
        -- Check if workspace_id column exists
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'invoices' AND column_name = 'workspace_id' AND table_schema = 'public'
        ) THEN
            -- Add workspace_id column
            ALTER TABLE invoices ADD COLUMN workspace_id UUID;
            RAISE NOTICE 'Added workspace_id column to invoices table';
            
            -- Update existing records to use a default workspace (if any exists)
            UPDATE invoices 
            SET workspace_id = (SELECT id FROM workspaces LIMIT 1)
            WHERE workspace_id IS NULL;
            
            -- Make workspace_id NOT NULL after updating existing records
            ALTER TABLE invoices ALTER COLUMN workspace_id SET NOT NULL;
            
            -- Add foreign key constraint
            ALTER TABLE invoices 
            ADD CONSTRAINT fk_invoices_workspace_id 
            FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
            
            RAISE NOTICE 'Updated existing invoices with workspace_id and added constraints';
        ELSE
            RAISE NOTICE 'workspace_id column already exists in invoices table';
        END IF;
        
        -- Enable RLS on invoices table
        ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS enabled on invoices table';
        
        -- Drop existing policies
        DROP POLICY IF EXISTS "Allow workspace members to view invoices" ON invoices;
        DROP POLICY IF EXISTS "Allow workspace members to insert invoices" ON invoices;
        DROP POLICY IF EXISTS "Allow workspace members to update invoices" ON invoices;
        DROP POLICY IF EXISTS "Allow workspace members to delete invoices" ON invoices;
        DROP POLICY IF EXISTS "Owners can manage invoices" ON invoices;
        DROP POLICY IF EXISTS "Members can view invoices" ON invoices;
        DROP POLICY IF EXISTS "Only owners can view invoices" ON invoices;
        DROP POLICY IF EXISTS "Only owners can insert invoices" ON invoices;
        DROP POLICY IF EXISTS "Only owners can update invoices" ON invoices;
        DROP POLICY IF EXISTS "Only owners can delete invoices" ON invoices;
        
        -- Create RLS policies for invoices - ONLY OWNERS can access
        CREATE POLICY "Only owners can view invoices" ON invoices
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM workspaces 
              WHERE id = invoices.workspace_id AND owner_id = auth.uid()
            )
          );

        CREATE POLICY "Only owners can insert invoices" ON invoices
          FOR INSERT WITH CHECK (
            EXISTS (
              SELECT 1 FROM workspaces 
              WHERE id = invoices.workspace_id AND owner_id = auth.uid()
            )
          );

        CREATE POLICY "Only owners can update invoices" ON invoices
          FOR UPDATE USING (
            EXISTS (
              SELECT 1 FROM workspaces 
              WHERE id = invoices.workspace_id AND owner_id = auth.uid()
            )
          ) WITH CHECK (
            EXISTS (
              SELECT 1 FROM workspaces 
              WHERE id = invoices.workspace_id AND owner_id = auth.uid()
            )
          );

        CREATE POLICY "Only owners can delete invoices" ON invoices
          FOR DELETE USING (
            EXISTS (
              SELECT 1 FROM workspaces 
              WHERE id = invoices.workspace_id AND owner_id = auth.uid()
            )
          );
        
        RAISE NOTICE 'RLS policies created for invoices table';
    ELSE
        RAISE NOTICE 'Invoices table does not exist, skipping RLS setup';
    END IF;
END $$;

-- Verify RLS is enabled and policies are active
SELECT 'Final RLS status:' as info, schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'invoices' AND schemaname = 'public';

-- Show active policies
SELECT 'Active policies:' as info, schemaname, tablename, policyname, permissive, cmd
FROM pg_policies 
WHERE tablename = 'invoices' AND schemaname = 'public'
ORDER BY policyname;

-- Add comments for documentation
COMMENT ON TABLE invoices IS 'Invoices table with RLS enabled - only workspace owners can access invoices';


-- ============================================
-- FILE: supabase/migrations/0023_add_start_date_to_tasks.sql
-- ============================================

-- Add start_date column to tasks table
-- This migration adds a start_date field to track when a task should be started

-- Add start_date column to tasks table
ALTER TABLE tasks 
ADD COLUMN start_date DATE;

-- Add comment to explain the column
COMMENT ON COLUMN tasks.start_date IS 'Date when the task should be started';

-- Create index for better performance on start_date queries
CREATE INDEX IF NOT EXISTS idx_tasks_start_date ON tasks(start_date);

-- Update existing tasks to have start_date set to created_at if not set
UPDATE tasks 
SET start_date = created_at::date 
WHERE start_date IS NULL;


-- ============================================
-- FILE: supabase/migrations/0024_add_end_date_to_tasks.sql
-- ============================================

-- Add end_date column to tasks table
-- This migration adds an end_date field to track when a task should be completed

-- Add end_date column to tasks table
ALTER TABLE tasks 
ADD COLUMN end_date DATE;

-- Add comment to explain the column
COMMENT ON COLUMN tasks.end_date IS 'Date when the task should be completed';

-- Create index for better performance on end_date queries
CREATE INDEX IF NOT EXISTS idx_tasks_end_date ON tasks(end_date);

-- Update existing tasks to have end_date set to due_date if not set
UPDATE tasks 
SET end_date = due_date 
WHERE end_date IS NULL AND due_date IS NOT NULL;


-- ============================================
-- FILE: supabase/migrations/0026_add_completed_at_trigger.sql
-- ============================================

-- Add trigger to automatically set completed_at when status changes to 'done'
-- This migration creates a trigger that sets completed_at timestamp when task status becomes 'done'

-- Create function to handle completed_at update
CREATE OR REPLACE FUNCTION set_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  -- If status is being changed to 'done' and completed_at is not already set
  IF NEW.status = 'done' AND OLD.status != 'done' AND NEW.completed_at IS NULL THEN
    NEW.completed_at = NOW();
  END IF;
  
  -- If status is being changed away from 'done', clear completed_at
  IF NEW.status != 'done' AND OLD.status = 'done' THEN
    NEW.completed_at = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on tasks table
CREATE TRIGGER trigger_set_completed_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_completed_at();

-- Add comment to explain the trigger
COMMENT ON TRIGGER trigger_set_completed_at ON tasks IS 'Automatically sets completed_at when status changes to done';



-- ============================================
-- FILE: supabase/migrations/0030_create_task_checklist.sql
-- ============================================

-- Create task_checklist_items table for task sub-tasks/checklist functionality
CREATE TABLE task_checklist_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Add RLS policies
ALTER TABLE task_checklist_items ENABLE ROW LEVEL SECURITY;

-- Policy for workspace members to view checklist items
CREATE POLICY "Users can view task checklist items for their workspace tasks" ON task_checklist_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE t.id = task_checklist_items.task_id
      AND wm.user_id = auth.uid()
    )
  );

-- Policy for workspace members to insert checklist items
CREATE POLICY "Users can insert task checklist items for their workspace tasks" ON task_checklist_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE t.id = task_checklist_items.task_id
      AND wm.user_id = auth.uid()
    )
  );

-- Policy for workspace members to update checklist items
CREATE POLICY "Users can update task checklist items for their workspace tasks" ON task_checklist_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE t.id = task_checklist_items.task_id
      AND wm.user_id = auth.uid()
    )
  );

-- Policy for workspace members to delete checklist items
CREATE POLICY "Users can delete task checklist items for their workspace tasks" ON task_checklist_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE t.id = task_checklist_items.task_id
      AND wm.user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_task_checklist_items_task_id ON task_checklist_items(task_id);
CREATE INDEX idx_task_checklist_items_position ON task_checklist_items(task_id, position);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_task_checklist_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_task_checklist_items_updated_at
  BEFORE UPDATE ON task_checklist_items
  FOR EACH ROW
  EXECUTE FUNCTION update_task_checklist_items_updated_at();


-- ============================================
-- FILE: supabase/migrations/0033_fix_checklist_rls_proper.sql
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view task checklist items for their workspace tasks" ON task_checklist_items;
DROP POLICY IF EXISTS "Users can insert task checklist items for their workspace tasks" ON task_checklist_items;
DROP POLICY IF EXISTS "Users can update task checklist items for their workspace tasks" ON task_checklist_items;
DROP POLICY IF EXISTS "Users can delete task checklist items for their workspace tasks" ON task_checklist_items;

-- Create corrected RLS policies
-- Policy for workspace members to view checklist items
CREATE POLICY "Users can view task checklist items for their workspace tasks" ON task_checklist_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE t.id = task_checklist_items.task_id
      AND wm.user_id = auth.uid()
    )
  );

-- Policy for workspace members to insert checklist items
-- Use the NEW.task_id from the INSERT values
CREATE POLICY "Users can insert task checklist items for their workspace tasks" ON task_checklist_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE t.id = NEW.task_id
      AND wm.user_id = auth.uid()
    )
  );

-- Policy for workspace members to update checklist items
CREATE POLICY "Users can update task checklist items for their workspace tasks" ON task_checklist_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE t.id = task_checklist_items.task_id
      AND wm.user_id = auth.uid()
    )
  );

-- Policy for workspace members to delete checklist items
CREATE POLICY "Users can delete task checklist items for their workspace tasks" ON task_checklist_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE t.id = task_checklist_items.task_id
      AND wm.user_id = auth.uid()
    )
  );


-- ============================================
-- FILE: supabase/migrations/0034_add_hourly_rate_to_projects.sql
-- ============================================

-- Add hourly_rate_cents column to projects table
ALTER TABLE projects ADD COLUMN hourly_rate_cents INTEGER;

-- Add comment
COMMENT ON COLUMN projects.hourly_rate_cents IS 'Hourly rate in cents for the project';


-- ============================================
-- FILE: supabase/migrations/0035_create_task_files_storage.sql
-- ============================================

-- Create storage bucket for task files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task-files',
  'task-files',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
);

-- Create RLS policies for task files
CREATE POLICY "Users can view task files for their workspace tasks" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'task-files' AND
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE t.id = (storage.foldername(name))[1]::uuid
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload task files for their workspace tasks" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'task-files' AND
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE t.id = (storage.foldername(name))[1]::uuid
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update task files for their workspace tasks" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'task-files' AND
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE t.id = (storage.foldername(name))[1]::uuid
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete task files for their workspace tasks" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'task-files' AND
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE t.id = (storage.foldername(name))[1]::uuid
      AND wm.user_id = auth.uid()
    )
  );


-- ============================================
-- FILE: supabase/migrations/0036_create_task_files_bucket.sql
-- ============================================

-- Create storage bucket for task files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task-files', 
  'task-files', 
  true, 
  10485760, -- 10MB limit
  ARRAY[
    'image/*', 
    'application/pdf', 
    'text/*', 
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
    'application/vnd.ms-excel', 
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS for the bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to view their workspace task files
CREATE POLICY "Allow authenticated users to view their workspace task files"
ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'task-files' AND EXISTS (
    SELECT 1 FROM tasks t
    JOIN projects p ON t.project_id = p.id
    JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
    WHERE t.id = (regexp_match(name, '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/.*$'))[1]::uuid
    AND wm.user_id = auth.uid()
  )
);

-- Policy for authenticated users to upload to their workspace task files
CREATE POLICY "Allow authenticated users to upload to their workspace task files"
ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'task-files' AND EXISTS (
    SELECT 1 FROM tasks t
    JOIN projects p ON t.project_id = p.id
    JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
    WHERE t.id = (regexp_match(name, '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/.*$'))[1]::uuid
    AND wm.user_id = auth.uid()
  )
);

-- Policy for authenticated users to delete their workspace task files
CREATE POLICY "Allow authenticated users to delete their workspace task files"
ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'task-files' AND EXISTS (
    SELECT 1 FROM tasks t
    JOIN projects p ON t.project_id = p.id
    JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
    WHERE t.id = (regexp_match(name, '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/.*$'))[1]::uuid
    AND wm.user_id = auth.uid()
  )
);


-- ============================================
-- FILE: supabase/migrations/0037_add_budget_cents_to_projects.sql
-- ============================================

-- Add budget_cents column to projects table
ALTER TABLE projects ADD COLUMN budget_cents INTEGER;

-- Add comment
COMMENT ON COLUMN projects.budget_cents IS 'Budget/fixed fee in cents for the project';



-- ============================================
-- FILE: supabase/migrations/0038_add_budget_cents_to_tasks.sql
-- ============================================

-- Add budget_cents column to tasks table
ALTER TABLE tasks ADD COLUMN budget_cents INTEGER;

-- Add comment
COMMENT ON COLUMN tasks.budget_cents IS 'Individual budget for the task in cents';



-- ============================================
-- FILE: supabase/migrations/0039_enable_rls_workspace_members.sql
-- ============================================

ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can manage workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Members can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Members can insert workspace members" ON workspace_members;

CREATE OR REPLACE FUNCTION is_workspace_member_or_owner(p_workspace_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM workspaces 
    WHERE id = p_workspace_id AND owner_id = p_user_id
  ) THEN
    RETURN TRUE;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_id = p_workspace_id AND user_id = p_user_id
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Owners can manage workspace members" ON workspace_members
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM workspaces 
    WHERE id = workspace_members.workspace_id 
    AND owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspaces 
    WHERE id = workspace_members.workspace_id 
    AND owner_id = auth.uid()
  )
);

CREATE POLICY "Members can view workspace members" ON workspace_members
FOR SELECT 
USING (
  is_workspace_member_or_owner(workspace_members.workspace_id, auth.uid())
);


-- ============================================
-- FILE: supabase/migrations/0040_remove_auto_workspace_assignment.sql
-- ============================================

-- Migration: Remove automatic workspace assignment trigger
-- Purpose: Prevent new users from being automatically added to Layers workspace
-- Date: 2025-10-29
-- 
-- This migration removes the trigger that automatically adds new users to the
-- "Layers s.r.o." workspace when they register.

-- Step 1: List all triggers on auth.users to identify what needs to be removed
DO $$
DECLARE
    trigger_name TEXT;
BEGIN
    RAISE NOTICE 'Searching for triggers on auth.users...';
    
    FOR trigger_name IN
        SELECT t.trigger_name
        FROM information_schema.triggers t
        WHERE t.event_object_schema = 'auth'
          AND t.event_object_table = 'users'
    LOOP
        RAISE NOTICE 'Found trigger: %', trigger_name;
    END LOOP;
END $$;

-- Step 2: Find and drop functions that automatically add users to Layers workspace
DO $$
DECLARE
    func_name TEXT;
    func_schema TEXT;
BEGIN
    RAISE NOTICE 'Searching for functions that add to Layers workspace...';
    
    FOR func_schema, func_name IN
        SELECT 
            routine_schema,
            routine_name
        FROM information_schema.routines
        WHERE routine_schema IN ('auth', 'public')
          AND routine_type = 'FUNCTION'
          AND (
            routine_definition LIKE '%Layers s.r.o.%'
            OR routine_definition LIKE '%Layers workspace%'
            OR (routine_definition LIKE '%Layers%' AND routine_definition LIKE '%workspace_members%')
          )
          AND routine_definition LIKE '%INSERT INTO%workspace_members%'
    LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS %I.%I() CASCADE', func_schema, func_name);
        RAISE NOTICE 'Dropped function: %.%', func_schema, func_name;
    END LOOP;
END $$;

-- Step 3: Find and drop triggers that call functions adding to workspace_members
-- Note: We need to check triggers more carefully
DO $$
DECLARE
    trigger_rec RECORD;
    func_oid OID;
BEGIN
    RAISE NOTICE 'Searching for triggers that add to workspace_members...';
    
    FOR trigger_rec IN
        SELECT 
            tgname as trigger_name,
            tgrelid::regclass as table_name,
            tgfoid as function_oid
        FROM pg_trigger
        WHERE tgrelid = 'auth.users'::regclass
          AND tgisinternal = false
    LOOP
        -- Check if the function associated with this trigger contains workspace_members or Layers
        SELECT prosrc INTO func_oid
        FROM pg_proc
        WHERE oid = trigger_rec.function_oid
        AND (
            prosrc LIKE '%workspace_members%'
            OR prosrc LIKE '%Layers%'
        );
        
        IF func_oid IS NOT NULL THEN
            EXECUTE format('DROP TRIGGER IF EXISTS %I ON auth.users CASCADE', trigger_rec.trigger_name);
            RAISE NOTICE 'Dropped trigger: %', trigger_rec.trigger_name;
        END IF;
    END LOOP;
END $$;

-- Step 4: Alternative approach - directly drop trigger if we know its name pattern
-- Common trigger names: handle_new_user, on_auth_user_created, etc.
DO $$
DECLARE
    known_trigger_names TEXT[] := ARRAY[
        'handle_new_user',
        'on_auth_user_created',
        'add_user_to_layers_workspace',
        'trigger_add_user_to_layers'
    ];
    trigger_name TEXT;
BEGIN
    FOREACH trigger_name IN ARRAY known_trigger_names
    LOOP
        BEGIN
            EXECUTE format('DROP TRIGGER IF EXISTS %I ON auth.users CASCADE', trigger_name);
            RAISE NOTICE 'Attempted to drop trigger: %', trigger_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Trigger % does not exist or could not be dropped: %', trigger_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- Step 5: Add extra protection - trigger to prevent unauthorized additions
CREATE OR REPLACE FUNCTION prevent_unauthorized_workspace_member_addition()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the insert is authorized (by owner)
  -- This should never be needed if RLS works, but adds extra safety
  IF NOT EXISTS (
    SELECT 1 FROM workspaces 
    WHERE id = NEW.workspace_id 
    AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized attempt to add user to workspace: User % attempted to add user % to workspace % without being owner', 
      auth.uid(), 
      NEW.user_id, 
      NEW.workspace_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists (in case it was created before)
DROP TRIGGER IF EXISTS trigger_prevent_unauthorized_workspace_addition ON workspace_members;

-- Create trigger as extra safety measure
CREATE TRIGGER trigger_prevent_unauthorized_workspace_addition
  BEFORE INSERT ON workspace_members
  FOR EACH ROW
  EXECUTE FUNCTION prevent_unauthorized_workspace_member_addition();

DO $$
BEGIN
  RAISE NOTICE 'Added extra protection trigger on workspace_members';
END $$;

-- Step 6: Verify RLS is enabled on workspace_members
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'workspace_members'
    AND rowsecurity = TRUE
  ) THEN
    ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on workspace_members';
  ELSE
    RAISE NOTICE 'RLS already enabled on workspace_members';
  END IF;
END $$;

-- Step 7: Final verification - check if any problematic triggers remain
DO $$
DECLARE
    remaining_count INT;
BEGIN
    SELECT COUNT(*) INTO remaining_count
    FROM pg_trigger tg
    JOIN pg_proc p ON p.oid = tg.tgfoid
    WHERE tg.tgrelid = 'auth.users'::regclass
      AND tg.tgisinternal = false
      AND (p.prosrc LIKE '%workspace_members%' OR p.prosrc LIKE '%Layers%');
    
    IF remaining_count > 0 THEN
        RAISE WARNING 'Found % remaining trigger(s) - manual review needed!', remaining_count;
    ELSE
        RAISE NOTICE 'Successfully removed automatic workspace assignment trigger';
        RAISE NOTICE 'New users will NO LONGER be automatically added to Layers workspace';
    END IF;
END $$;


-- ============================================
-- FILE: supabase/migrations/0041_fix_workspaces_rls_for_owners.sql
-- ============================================

DROP POLICY IF EXISTS "Users can view accessible workspaces" ON workspaces;

DROP FUNCTION IF EXISTS user_has_workspace_access(UUID, UUID);
DROP FUNCTION IF EXISTS user_has_workspace_access(uuid, uuid);

CREATE OR REPLACE FUNCTION user_has_workspace_access(p_workspace_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM workspaces 
    WHERE id = p_workspace_id AND owner_id = p_user_id
  ) THEN
    RETURN TRUE;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_id = p_workspace_id AND user_id = p_user_id
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Users can view accessible workspaces" ON workspaces
  FOR SELECT USING (
    user_has_workspace_access(id, auth.uid())
  );


-- ============================================
-- FILE: supabase/migrations/0042_create_user_settings.sql
-- ============================================

-- Migration: Create user_settings table
-- Purpose: Store user preferences and settings

-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  language VARCHAR(10) DEFAULT 'sk',
  theme VARCHAR(20) DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  notifications JSONB DEFAULT '{"email": true, "push": true, "task_updates": true}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- Create function to automatically create settings for new users
CREATE OR REPLACE FUNCTION create_user_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create settings when user is created
DROP TRIGGER IF EXISTS trigger_create_user_settings ON auth.users;
CREATE TRIGGER trigger_create_user_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_settings();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at
DROP TRIGGER IF EXISTS trigger_update_user_settings_updated_at ON user_settings;
CREATE TRIGGER trigger_update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_settings_updated_at();

-- Enable RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view their own settings
CREATE POLICY "Users can view own settings" ON user_settings
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own settings
CREATE POLICY "Users can update own settings" ON user_settings
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can insert their own settings
CREATE POLICY "Users can insert own settings" ON user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON user_settings TO authenticated;

-- Add comments
COMMENT ON TABLE user_settings IS 'User preferences and settings';
COMMENT ON COLUMN user_settings.language IS 'User preferred language (sk, en, etc.)';
COMMENT ON COLUMN user_settings.theme IS 'UI theme preference (light, dark, system)';
COMMENT ON COLUMN user_settings.notifications IS 'Notification preferences as JSONB';



-- ============================================
-- FILE: supabase/migrations/0043_add_company_fields_to_workspace.sql
-- ============================================

-- Migration: Add company fields to workspace
-- Purpose: Store company information in workspace

-- Add company fields to workspaces table
ALTER TABLE workspaces
ADD COLUMN IF NOT EXISTS company_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS company_tax_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS company_address TEXT,
ADD COLUMN IF NOT EXISTS company_phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS company_email VARCHAR(255);

-- Add comments
COMMENT ON COLUMN workspaces.company_name IS 'Názov firmy/spoločnosti';
COMMENT ON COLUMN workspaces.company_tax_id IS 'IČO/DIČ firmy';
COMMENT ON COLUMN workspaces.company_address IS 'Adresa firmy';
COMMENT ON COLUMN workspaces.company_phone IS 'Telefón firmy';
COMMENT ON COLUMN workspaces.company_email IS 'Email firmy';



-- ============================================
-- FILE: supabase/migrations/0044_add_name_fields_to_profiles.sql
-- ============================================

-- Migration: Add first_name and last_name to profiles
-- Purpose: Separate first name and last name instead of only display_name

-- Add name fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);

-- Add comments
COMMENT ON COLUMN profiles.first_name IS 'Meno používateľa';
COMMENT ON COLUMN profiles.last_name IS 'Priezvisko používateľa';

-- Update existing display_name to first_name if not already set
UPDATE profiles
SET first_name = SPLIT_PART(display_name, ' ', 1),
    last_name = CASE 
      WHEN display_name LIKE '% %' THEN SPLIT_PART(display_name, ' ', 2)
      ELSE NULL
    END
WHERE first_name IS NULL AND display_name IS NOT NULL;



-- ============================================
-- FILE: supabase/migrations/0045_create_bugs_table.sql
-- ============================================

-- Migration: Create bugs table for bug reporting
-- Purpose: Allow users to report bugs with RLS policies

-- Create helper function to check if user is superadmin
CREATE OR REPLACE FUNCTION is_superadmin(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Get user email
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = user_id;
  
  -- René Moravec email (update if needed)
  RETURN user_email = 'design@renemoravec.sk' OR user_email = 'rene@renemoravec.sk';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_superadmin(UUID) TO authenticated;

-- Create bugs table
CREATE TABLE IF NOT EXISTS bugs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT bugs_description_not_empty CHECK (LENGTH(TRIM(description)) > 0),
  CONSTRAINT bugs_url_not_empty CHECK (LENGTH(TRIM(url)) > 0)
);

-- Add comments
COMMENT ON TABLE bugs IS 'Tabuľka pre reportovanie bugov';
COMMENT ON COLUMN bugs.id IS 'Unikátne ID bug reportu';
COMMENT ON COLUMN bugs.user_id IS 'ID používateľa, ktorý nahlásil bug';
COMMENT ON COLUMN bugs.description IS 'Popis bugu';
COMMENT ON COLUMN bugs.url IS 'URL stránky, kde bol bug nahlásený';
COMMENT ON COLUMN bugs.created_at IS 'Dátum a čas nahlásenia bugu';

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_bugs_user_id ON bugs(user_id);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_bugs_created_at ON bugs(created_at DESC);

-- Enable RLS
ALTER TABLE bugs ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can insert bugs
-- Users can only insert bugs where user_id matches their auth.uid()
CREATE POLICY "Users can insert bugs"
ON bugs
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND
  auth.uid() = user_id
);

-- Policy: Only superadmin can select bugs
-- Superadmin is identified by JWT claim app_role = 'superadmin' or by email
CREATE POLICY "Superadmin can select bugs"
ON bugs
FOR SELECT
TO authenticated
USING (
  (auth.jwt() ->> 'app_role')::text = 'superadmin' OR
  is_superadmin(auth.uid())
);

-- Grant permissions
GRANT INSERT ON bugs TO authenticated;
GRANT SELECT ON bugs TO authenticated;



-- ============================================
-- FILE: supabase/migrations/0046_set_superadmin_jwt_claim.sql
-- ============================================

-- Migration: Documentation for setting superadmin JWT claim
-- Purpose: Instructions for setting JWT claim app_role = 'superadmin' for René Moravec
-- Note: The is_superadmin() function is already created in migration 0045

-- To set superadmin JWT claim for René Moravec:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Find user with email: design@renemoravec.sk or rene@renemoravec.sk
-- 3. Edit user > Raw App Meta Data
-- 4. Add: {"app_role": "superadmin"}
-- 5. Save changes
--
-- Alternatively, use Supabase Auth Admin API:
-- supabase.auth.admin.updateUserById(userId, {
--   app_metadata: { app_role: 'superadmin' }
-- })
--
-- The RLS policy in bugs table already supports both:
-- - JWT claim app_role = 'superadmin'
-- - Email check via is_superadmin() function



-- ============================================
-- FILE: supabase/migrations/0047_fix_bugs_rls_policy.sql
-- ============================================

-- Migration: Fix bugs RLS policy for INSERT
-- Purpose: Update existing INSERT policy to ensure it works correctly with auth.uid()

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Users can insert bugs" ON bugs;

-- Create new INSERT policy that allows authenticated users to insert their own bugs
-- The user_id must match auth.uid() to ensure users can only insert bugs for themselves
-- Using simple check like other tables (profiles, etc.)
CREATE POLICY "Users can insert bugs"
ON bugs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);



-- ============================================
-- FILE: supabase/migrations/0048_create_insert_bug_function.sql
-- ============================================

-- Migration: Create function to insert bugs with proper auth context
-- Purpose: Ensure bugs can be inserted correctly with RLS

-- Create function to insert bug report
-- This function runs with SECURITY DEFINER, so it bypasses RLS but still checks auth.uid()
CREATE OR REPLACE FUNCTION insert_bug_report(
  p_description TEXT,
  p_url TEXT
)
RETURNS bugs AS $$
DECLARE
  v_user_id UUID;
  v_bug bugs;
BEGIN
  -- Get current authenticated user
  v_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to report bugs';
  END IF;
  
  -- Insert bug report
  INSERT INTO bugs (user_id, description, url)
  VALUES (v_user_id, p_description, p_url)
  RETURNING * INTO v_bug;
  
  RETURN v_bug;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION insert_bug_report(TEXT, TEXT) TO authenticated;



-- ============================================
-- FILE: supabase/migrations/0049_fix_bugs_select_policy.sql
-- ============================================

-- Migration: Fix bugs SELECT RLS policy
-- Purpose: Ensure superadmin can see all bugs

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Superadmin can select bugs" ON bugs;

-- Create new SELECT policy that uses function (which has SECURITY DEFINER)
-- This avoids direct access to auth.users table
CREATE POLICY "Superadmin can select bugs"
ON bugs
FOR SELECT
TO authenticated
USING (
  (auth.jwt() ->> 'app_role')::text = 'superadmin' OR
  is_superadmin(auth.uid())
);



-- ============================================
-- FILE: supabase/migrations/0051_add_resolved_to_bugs.sql
-- ============================================

-- Migration: Add is_resolved column to bugs table
-- Purpose: Allow marking bugs as resolved/unresolved

-- Add is_resolved column
ALTER TABLE bugs
ADD COLUMN IF NOT EXISTS is_resolved BOOLEAN DEFAULT FALSE;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_bugs_is_resolved ON bugs(is_resolved);

-- Add comment
COMMENT ON COLUMN bugs.is_resolved IS 'Označuje, či bol bug vyriešený';



-- ============================================
-- FILE: supabase/migrations/0052_add_bugs_update_policy.sql
-- ============================================

-- Migration: Add UPDATE policy for bugs table
-- Purpose: Allow superadmin to update bug reports (mark as resolved)

-- Policy: Only superadmin can update bugs
-- Superadmin is identified by email (René Moravec)
CREATE POLICY "Superadmin can update bugs"
ON bugs
FOR UPDATE
TO authenticated
USING (
  auth.email() = 'design@renemoravec.sk' OR
  auth.email() = 'rene@renemoravec.sk'
)
WITH CHECK (
  auth.email() = 'design@renemoravec.sk' OR
  auth.email() = 'rene@renemoravec.sk'
);

-- Grant UPDATE permission
GRANT UPDATE ON bugs TO authenticated;



-- ============================================
-- FILE: supabase/migrations/0053_add_bugs_delete_policy.sql
-- ============================================

-- Migration: Add DELETE policy for bugs table
-- Purpose: Allow superadmin to delete bug reports

-- Policy: Only superadmin can delete bugs
-- Superadmin is identified by email (René Moravec)
CREATE POLICY "Superadmin can delete bugs"
ON bugs
FOR DELETE
TO authenticated
USING (
  auth.email() = 'design@renemoravec.sk' OR
  auth.email() = 'rene@renemoravec.sk'
);

-- Grant DELETE permission
GRANT DELETE ON bugs TO authenticated;



-- ============================================
-- FILE: supabase/migrations/0057_completely_remove_all_profile_triggers.sql
-- ============================================

-- Migration: Completely remove all profile-related triggers and hooks
-- Purpose: Ensure nothing blocks user registration
-- This should be run AFTER 0055_remove_profile_trigger.sql

-- Drop ALL triggers on auth.users that might be related to profiles
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_table = 'users' 
        AND event_object_schema = 'auth'
        AND trigger_name LIKE '%profile%' OR trigger_name LIKE '%user%' OR trigger_name LIKE '%new%'
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.trigger_name) || ' ON auth.users CASCADE';
        RAISE NOTICE 'Dropped trigger: %', r.trigger_name;
    END LOOP;
END $$;

-- Drop the handle_new_user function completely (if it exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'handle_new_user' 
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN
        DROP FUNCTION public.handle_new_user() CASCADE;
        RAISE NOTICE 'Dropped function: handle_new_user';
    ELSE
        RAISE NOTICE 'Function handle_new_user does not exist, skipping';
    END IF;
END $$;

-- Verify no triggers exist on auth.users
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
AND event_object_schema = 'auth';



-- ============================================
-- FILE: supabase/migrations/0058_make_project_id_nullable_in_tasks.sql
-- ============================================

-- Migration: Make project_id nullable in tasks table
-- Purpose: Allow tasks to exist without a project

-- Drop the NOT NULL constraint on project_id
ALTER TABLE tasks 
ALTER COLUMN project_id DROP NOT NULL;

-- Update the foreign key constraint to allow NULL values
-- First, drop the existing foreign key constraint if it exists
DO $$ 
BEGIN
  -- Find and drop the existing foreign key constraint
  ALTER TABLE tasks 
  DROP CONSTRAINT IF EXISTS tasks_project_id_fkey;
  
  -- Recreate the foreign key constraint that allows NULL
  ALTER TABLE tasks 
  ADD CONSTRAINT tasks_project_id_fkey 
  FOREIGN KEY (project_id) 
  REFERENCES projects(id) 
  ON DELETE CASCADE;
END $$;

-- Add comment
COMMENT ON COLUMN tasks.project_id IS 'Reference to project. Can be NULL for tasks without a project.';

-- Verify the change
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tasks' 
  AND column_name = 'project_id';



-- ============================================
-- FILE: supabase/migrations/0059_fix_tasks_rls_for_owners.sql
-- ============================================

-- Migration: Fix tasks RLS policy for owners to allow INSERT operations
-- Purpose: Add WITH CHECK clause to allow owners to create tasks

-- Drop existing policy
DROP POLICY IF EXISTS "Owners can manage tasks" ON tasks;

-- Recreate policy with WITH CHECK for INSERT operations
CREATE POLICY "Owners can manage tasks" ON tasks
  FOR ALL 
  USING (
    is_workspace_owner(workspace_id, auth.uid())
  )
  WITH CHECK (
    is_workspace_owner(workspace_id, auth.uid())
  );

-- Also fix time entries, task assignees, and task comments policies
DROP POLICY IF EXISTS "Owners can manage time entries" ON time_entries;
CREATE POLICY "Owners can manage time entries" ON time_entries
  FOR ALL 
  USING (
    is_workspace_owner(workspace_id, auth.uid())
  )
  WITH CHECK (
    is_workspace_owner(workspace_id, auth.uid())
  );

DROP POLICY IF EXISTS "Owners can manage task assignees" ON task_assignees;
CREATE POLICY "Owners can manage task assignees" ON task_assignees
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_assignees.task_id
      AND is_workspace_owner(t.workspace_id, auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_assignees.task_id
      AND is_workspace_owner(t.workspace_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "Owners can manage task comments" ON task_comments;
CREATE POLICY "Owners can manage task comments" ON task_comments
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_comments.task_id
      AND is_workspace_owner(t.workspace_id, auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_comments.task_id
      AND is_workspace_owner(t.workspace_id, auth.uid())
    )
  );



-- ============================================
-- FILE: supabase/migrations/0060_add_get_task_workspace_function.sql
-- ============================================

-- Migration: Add function to get task workspace_id without RLS restrictions
-- Purpose: Allow API to get workspace_id from task even if RLS blocks access

-- Drop existing function if it exists (with any parameter name)
-- PostgreSQL requires specifying parameter types for DROP FUNCTION
DROP FUNCTION IF EXISTS get_task_workspace_id(UUID);
DROP FUNCTION IF EXISTS get_task_workspace_id(uuid);
-- Also try dropping with old parameter name if it exists
DO $$ 
BEGIN
  -- Try to drop function with old parameter name
  EXECUTE 'DROP FUNCTION IF EXISTS get_task_workspace_id(p_task_id UUID)';
  EXECUTE 'DROP FUNCTION IF EXISTS get_task_workspace_id(p_task_id uuid)';
EXCEPTION
  WHEN OTHERS THEN
    -- Ignore errors if function doesn't exist
    NULL;
END $$;

-- Create function to get task workspace_id
CREATE OR REPLACE FUNCTION get_task_workspace_id(task_id_param UUID)
RETURNS UUID AS $$
DECLARE
  result_workspace_id UUID;
BEGIN
  SELECT workspace_id INTO result_workspace_id
  FROM tasks
  WHERE id = task_id_param;
  
  RETURN result_workspace_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_task_workspace_id(UUID) TO authenticated;



-- ============================================
-- FILE: supabase/migrations/0061_fix_tasks_rls_for_workspace_members.sql
-- ============================================

-- Migration: Fix tasks RLS policy for workspace members
-- Purpose: Allow workspace members (not just owners) to view and manage tasks
-- This fixes the issue where members like Valentina cannot see tasks

-- Add policy for workspace members to manage tasks
-- This policy allows all workspace members to view, insert, update, and delete tasks
CREATE POLICY "Workspace members can manage tasks" ON tasks
  FOR ALL 
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
    OR is_workspace_owner(workspace_id, auth.uid())
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
    OR is_workspace_owner(workspace_id, auth.uid())
  );

-- Add policy for workspace members to manage time entries
CREATE POLICY "Workspace members can manage time entries" ON time_entries
  FOR ALL 
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
    OR is_workspace_owner(workspace_id, auth.uid())
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
    OR is_workspace_owner(workspace_id, auth.uid())
  );

-- Add policy for workspace members to manage task assignees
CREATE POLICY "Workspace members can manage task assignees" ON task_assignees
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_assignees.task_id
      AND (
        t.workspace_id IN (
          SELECT workspace_id 
          FROM workspace_members 
          WHERE user_id = auth.uid()
        )
        OR is_workspace_owner(t.workspace_id, auth.uid())
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_assignees.task_id
      AND (
        t.workspace_id IN (
          SELECT workspace_id 
          FROM workspace_members 
          WHERE user_id = auth.uid()
        )
        OR is_workspace_owner(t.workspace_id, auth.uid())
      )
    )
  );

-- Add policy for workspace members to manage task comments
CREATE POLICY "Workspace members can manage task comments" ON task_comments
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_comments.task_id
      AND (
        t.workspace_id IN (
          SELECT workspace_id 
          FROM workspace_members 
          WHERE user_id = auth.uid()
        )
        OR is_workspace_owner(t.workspace_id, auth.uid())
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_comments.task_id
      AND (
        t.workspace_id IN (
          SELECT workspace_id 
          FROM workspace_members 
          WHERE user_id = auth.uid()
        )
        OR is_workspace_owner(t.workspace_id, auth.uid())
      )
    )
  );



-- ============================================
-- FILE: supabase/migrations/0062_fix_task_timers_rls_for_workspace_members.sql
-- ============================================

-- Migration: Fix task_timers RLS policy for workspace members
-- Purpose: Allow workspace members (not just owners) to start and manage timers
-- This fixes the issue where members like Valentina cannot start task tracking

-- Create task_timers table if it doesn't exist
CREATE TABLE IF NOT EXISTS task_timers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  stopped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_task_timers_user_id ON task_timers(user_id);
CREATE INDEX IF NOT EXISTS idx_task_timers_task_id ON task_timers(task_id);
CREATE INDEX IF NOT EXISTS idx_task_timers_workspace_id ON task_timers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_task_timers_active ON task_timers(user_id, stopped_at) WHERE stopped_at IS NULL;

-- Enable RLS on task_timers if not already enabled
ALTER TABLE task_timers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Workspace members can manage task timers" ON task_timers;
DROP POLICY IF EXISTS "Owners can manage task timers" ON task_timers;
DROP POLICY IF EXISTS "Users can manage their own timers" ON task_timers;

-- Add policy for workspace members to manage task timers
-- This policy allows all workspace members to view, insert, update, and delete their own timers
-- Using simpler logic that checks workspace membership directly

-- Policy for SELECT - users can view their own timers
CREATE POLICY "Workspace members can view their own timers" ON task_timers
  FOR SELECT
  USING (
    user_id = auth.uid()
    AND (
      workspace_id IN (
        SELECT workspace_id 
        FROM workspace_members 
        WHERE user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM workspaces 
        WHERE id = workspace_id AND owner_id = auth.uid()
      )
    )
  );

-- Policy for INSERT - users can only create timers for themselves
CREATE POLICY "Workspace members can insert their own timers" ON task_timers
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (
      workspace_id IN (
        SELECT workspace_id 
        FROM workspace_members 
        WHERE user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM workspaces 
        WHERE id = workspace_id AND owner_id = auth.uid()
      )
    )
  );

-- Policy for UPDATE - users can update their own timers
CREATE POLICY "Workspace members can update their own timers" ON task_timers
  FOR UPDATE
  USING (
    user_id = auth.uid()
    AND (
      workspace_id IN (
        SELECT workspace_id 
        FROM workspace_members 
        WHERE user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM workspaces 
        WHERE id = workspace_id AND owner_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND (
      workspace_id IN (
        SELECT workspace_id 
        FROM workspace_members 
        WHERE user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM workspaces 
        WHERE id = workspace_id AND owner_id = auth.uid()
      )
    )
  );

-- Policy for DELETE - users can delete their own timers
CREATE POLICY "Workspace members can delete their own timers" ON task_timers
  FOR DELETE
  USING (
    user_id = auth.uid()
    AND (
      workspace_id IN (
        SELECT workspace_id 
        FROM workspace_members 
        WHERE user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM workspaces 
        WHERE id = workspace_id AND owner_id = auth.uid()
      )
    )
  );



-- ============================================
-- FILE: supabase/migrations/0063_fix_time_entries_rls_for_workspace_members.sql
-- ============================================

-- Migration: Fix time_entries RLS policy for workspace members
-- Purpose: Ensure workspace members can insert time entries
-- This fixes the issue where members like Valentina cannot save time to tasks

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Workspace members can manage time entries" ON time_entries;
DROP POLICY IF EXISTS "Owners can manage time entries" ON time_entries;

-- Create policy for workspace members to manage time entries
-- This policy allows all workspace members to view, insert, update, and delete time entries
CREATE POLICY "Workspace members can manage time entries" ON time_entries
  FOR ALL 
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM workspaces 
      WHERE id = workspace_id AND owner_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM workspaces 
      WHERE id = workspace_id AND owner_id = auth.uid()
    )
  );




-- ============================================
-- FILE: supabase/migrations/0064_make_project_id_nullable_in_time_entries.sql
-- ============================================

-- Migration: Make project_id nullable in time_entries table
-- Purpose: Allow time entries to exist without a project (for tasks without projects)
-- This fixes the issue where users cannot save time to tasks without a project

-- Drop the NOT NULL constraint on project_id
ALTER TABLE time_entries 
ALTER COLUMN project_id DROP NOT NULL;

-- Update the foreign key constraint to allow NULL values
-- First, drop the existing foreign key constraint if it exists
DO $$ 
BEGIN
  -- Find and drop the existing foreign key constraint
  ALTER TABLE time_entries 
  DROP CONSTRAINT IF EXISTS time_entries_project_id_fkey;
  
  -- Recreate the foreign key constraint that allows NULL
  ALTER TABLE time_entries 
  ADD CONSTRAINT time_entries_project_id_fkey 
  FOREIGN KEY (project_id) 
  REFERENCES projects(id) 
  ON DELETE CASCADE;
END $$;

-- Add comment
COMMENT ON COLUMN time_entries.project_id IS 'Reference to project. Can be NULL for time entries on tasks without a project.';

-- Verify the change
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'time_entries' 
  AND column_name = 'project_id';




-- ============================================
-- FILE: supabase/migrations/0065_add_default_hourly_rate_to_user_settings.sql
-- ============================================

-- Migration: Add default_hourly_rate to user_settings
-- Purpose: Allow users to set a default hourly rate for tasks without projects

-- Add default_hourly_rate column to user_settings
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS default_hourly_rate DECIMAL(10, 2);

-- Add comment
COMMENT ON COLUMN user_settings.default_hourly_rate IS 'Default hourly rate for tasks without projects (in euros)';




-- ============================================
-- FILE: supabase/migrations/0068_fix_is_workspace_member_bug.sql
-- ============================================

-- Migration: Fix is_workspace_member function bug
-- Purpose: Fix WHERE clause that compares parameter to itself instead of table column
-- This fixes the issue where workspace members cannot see projects/data
-- Date: 2025-11-11

-- ==============================================================================
-- FIX: is_workspace_member function
-- ==============================================================================

-- Drop existing buggy function
DROP FUNCTION IF EXISTS is_workspace_member(UUID, UUID);

-- Recreate with proper parameter names (with p_ prefix to avoid conflicts)
CREATE OR REPLACE FUNCTION is_workspace_member(p_workspace_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_members.workspace_id = p_workspace_id 
      AND workspace_members.user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION is_workspace_member IS 
  'Returns TRUE if user is a member of the workspace (fixed parameter naming bug)';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION is_workspace_member(UUID, UUID) TO authenticated;

-- ==============================================================================
-- ALSO FIX: is_workspace_owner function (same potential issue)
-- ==============================================================================

-- Drop existing function
DROP FUNCTION IF EXISTS is_workspace_owner(UUID, UUID);

-- Recreate with proper parameter names
CREATE OR REPLACE FUNCTION is_workspace_owner(p_workspace_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspaces 
    WHERE workspaces.id = p_workspace_id 
      AND workspaces.owner_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION is_workspace_owner IS 
  'Returns TRUE if user is the owner of the workspace (fixed parameter naming)';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION is_workspace_owner(UUID, UUID) TO authenticated;

-- ==============================================================================
-- UPDATE: Projects policies to ensure they work correctly
-- ==============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Owners can manage projects" ON projects;
DROP POLICY IF EXISTS "Members can view projects" ON projects;
DROP POLICY IF EXISTS "Workspace members can manage projects" ON projects;

-- Create updated policies using fixed functions
-- Policy 1: Owners can do everything
CREATE POLICY "Owners can manage projects" ON projects
  FOR ALL 
  USING (is_workspace_owner(workspace_id, auth.uid()))
  WITH CHECK (is_workspace_owner(workspace_id, auth.uid()));

-- Policy 2: Members can view projects (SELECT only)
CREATE POLICY "Members can view projects" ON projects
  FOR SELECT 
  USING (
    is_workspace_member(workspace_id, auth.uid())
    OR is_workspace_owner(workspace_id, auth.uid())
  );

-- Policy 3: Members can also INSERT/UPDATE/DELETE projects (full access like tasks)
-- This ensures members have same access to projects as they do to tasks
CREATE POLICY "Members can manage projects" ON projects
  FOR ALL
  USING (
    is_workspace_member(workspace_id, auth.uid())
    OR is_workspace_owner(workspace_id, auth.uid())
  )
  WITH CHECK (
    is_workspace_member(workspace_id, auth.uid())
    OR is_workspace_owner(workspace_id, auth.uid())
  );

-- ==============================================================================
-- UPDATE: Clients policies (same issue)
-- ==============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Owners can manage clients" ON clients;
DROP POLICY IF EXISTS "Members can view clients" ON clients;
DROP POLICY IF EXISTS "Workspace members can manage clients" ON clients;

-- Create updated policies
-- Policy 1: Owners can do everything
CREATE POLICY "Owners can manage clients" ON clients
  FOR ALL 
  USING (is_workspace_owner(workspace_id, auth.uid()))
  WITH CHECK (is_workspace_owner(workspace_id, auth.uid()));

-- Policy 2: Members can view clients
CREATE POLICY "Members can view clients" ON clients
  FOR SELECT 
  USING (
    is_workspace_member(workspace_id, auth.uid())
    OR is_workspace_owner(workspace_id, auth.uid())
  );

-- Policy 3: Members can manage clients
CREATE POLICY "Members can manage clients" ON clients
  FOR ALL
  USING (
    is_workspace_member(workspace_id, auth.uid())
    OR is_workspace_owner(workspace_id, auth.uid())
  )
  WITH CHECK (
    is_workspace_member(workspace_id, auth.uid())
    OR is_workspace_owner(workspace_id, auth.uid())
  );

-- ==============================================================================
-- VERIFICATION
-- ==============================================================================

DO $$
BEGIN
  -- Check that functions exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'is_workspace_member'
  ) THEN
    RAISE EXCEPTION 'Function is_workspace_member not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'is_workspace_owner'
  ) THEN
    RAISE EXCEPTION 'Function is_workspace_owner not created';
  END IF;
  
  -- Check that policies exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'projects' AND policyname = 'Owners can manage projects'
  ) THEN
    RAISE EXCEPTION 'Policy "Owners can manage projects" not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'projects' AND policyname = 'Members can view projects'
  ) THEN
    RAISE EXCEPTION 'Policy "Members can view projects" not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'projects' AND policyname = 'Members can manage projects'
  ) THEN
    RAISE EXCEPTION 'Policy "Members can manage projects" not created';
  END IF;
  
  RAISE NOTICE '✅ All functions and policies fixed successfully!';
  RAISE NOTICE '✅ Workspace members can now view and manage projects!';
END $$;



-- ============================================
-- FILE: supabase/migrations/0069_create_dashboard_permissions.sql
-- ============================================

-- Migration: Create dashboard_permissions table
-- Purpose: Allow workspace owners to control what dashboard sections are visible to each member
-- Date: 2025-11-11

-- Create dashboard_permissions table
CREATE TABLE IF NOT EXISTS dashboard_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Dashboard sections visibility (true = visible, false = hidden)
  show_stats_overview BOOLEAN DEFAULT true,
  show_tasks_section BOOLEAN DEFAULT true,
  show_activities_section BOOLEAN DEFAULT true,
  show_calendar_section BOOLEAN DEFAULT true,
  show_projects_section BOOLEAN DEFAULT true,
  show_clients_section BOOLEAN DEFAULT true,
  
  -- Task tabs visibility
  show_tab_all_active BOOLEAN DEFAULT true,
  show_tab_today BOOLEAN DEFAULT true,
  show_tab_sent_to_client BOOLEAN DEFAULT true,
  show_tab_in_progress BOOLEAN DEFAULT true,
  show_tab_unassigned BOOLEAN DEFAULT true,
  show_tab_overdue BOOLEAN DEFAULT true,
  show_tab_upcoming BOOLEAN DEFAULT true,
  
  -- Stats visibility
  show_stat_total_tasks BOOLEAN DEFAULT true,
  show_stat_completed_tasks BOOLEAN DEFAULT true,
  show_stat_in_progress_tasks BOOLEAN DEFAULT true,
  show_stat_total_hours BOOLEAN DEFAULT true,
  show_stat_completion_rate BOOLEAN DEFAULT true,
  
  -- Custom JSONB for future extensibility
  custom_settings JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One permission record per user per workspace
  UNIQUE(workspace_id, user_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_dashboard_permissions_workspace_id ON dashboard_permissions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_permissions_user_id ON dashboard_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_permissions_workspace_user ON dashboard_permissions(workspace_id, user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_dashboard_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at
DROP TRIGGER IF EXISTS trigger_update_dashboard_permissions_updated_at ON dashboard_permissions;
CREATE TRIGGER trigger_update_dashboard_permissions_updated_at
  BEFORE UPDATE ON dashboard_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_dashboard_permissions_updated_at();

-- Enable RLS
ALTER TABLE dashboard_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own dashboard permissions
CREATE POLICY "Users can view own dashboard permissions" ON dashboard_permissions
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Workspace owners can view all dashboard permissions in their workspace
CREATE POLICY "Owners can view workspace dashboard permissions" ON dashboard_permissions
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM workspaces 
      WHERE id = workspace_id AND owner_id = auth.uid()
    )
  );

-- Workspace owners can manage (insert/update/delete) dashboard permissions
CREATE POLICY "Owners can manage dashboard permissions" ON dashboard_permissions
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM workspaces 
      WHERE id = workspace_id AND owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspaces 
      WHERE id = workspace_id AND owner_id = auth.uid()
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON dashboard_permissions TO authenticated;

-- Add comments
COMMENT ON TABLE dashboard_permissions IS 'Dashboard visibility permissions per user per workspace';
COMMENT ON COLUMN dashboard_permissions.show_stats_overview IS 'Show/hide stats overview section';
COMMENT ON COLUMN dashboard_permissions.show_tasks_section IS 'Show/hide tasks section';
COMMENT ON COLUMN dashboard_permissions.show_activities_section IS 'Show/hide activities section';
COMMENT ON COLUMN dashboard_permissions.show_calendar_section IS 'Show/hide calendar section';
COMMENT ON COLUMN dashboard_permissions.show_projects_section IS 'Show/hide projects section';
COMMENT ON COLUMN dashboard_permissions.show_clients_section IS 'Show/hide clients section';
COMMENT ON COLUMN dashboard_permissions.custom_settings IS 'Custom settings for future extensibility';

-- Create helper function to get dashboard permissions with defaults
CREATE OR REPLACE FUNCTION get_dashboard_permissions(
  p_workspace_id UUID,
  p_user_id UUID
)
RETURNS TABLE (
  show_stats_overview BOOLEAN,
  show_tasks_section BOOLEAN,
  show_activities_section BOOLEAN,
  show_calendar_section BOOLEAN,
  show_projects_section BOOLEAN,
  show_clients_section BOOLEAN,
  show_tab_all_active BOOLEAN,
  show_tab_today BOOLEAN,
  show_tab_sent_to_client BOOLEAN,
  show_tab_in_progress BOOLEAN,
  show_tab_unassigned BOOLEAN,
  show_tab_overdue BOOLEAN,
  show_tab_upcoming BOOLEAN,
  show_stat_total_tasks BOOLEAN,
  show_stat_completed_tasks BOOLEAN,
  show_stat_in_progress_tasks BOOLEAN,
  show_stat_total_hours BOOLEAN,
  show_stat_completion_rate BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(dp.show_stats_overview, true),
    COALESCE(dp.show_tasks_section, true),
    COALESCE(dp.show_activities_section, true),
    COALESCE(dp.show_calendar_section, true),
    COALESCE(dp.show_projects_section, true),
    COALESCE(dp.show_clients_section, true),
    COALESCE(dp.show_tab_all_active, true),
    COALESCE(dp.show_tab_today, true),
    COALESCE(dp.show_tab_sent_to_client, true),
    COALESCE(dp.show_tab_in_progress, true),
    COALESCE(dp.show_tab_unassigned, true),
    COALESCE(dp.show_tab_overdue, true),
    COALESCE(dp.show_tab_upcoming, true),
    COALESCE(dp.show_stat_total_tasks, true),
    COALESCE(dp.show_stat_completed_tasks, true),
    COALESCE(dp.show_stat_in_progress_tasks, true),
    COALESCE(dp.show_stat_total_hours, true),
    COALESCE(dp.show_stat_completion_rate, true)
  FROM dashboard_permissions dp
  WHERE dp.workspace_id = p_workspace_id 
    AND dp.user_id = p_user_id
  LIMIT 1;
  
  -- If no record exists, return defaults
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      true, true, true, true, true, true,  -- sections
      true, true, true, true, true, true, true,  -- tabs
      true, true, true, true, true;  -- stats
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_dashboard_permissions IS 
  'Returns dashboard permissions for a user in a workspace, with defaults if not set';

GRANT EXECUTE ON FUNCTION get_dashboard_permissions(UUID, UUID) TO authenticated;



-- ============================================
-- FILE: supabase/migrations/0070_extend_dashboard_permissions.sql
-- ============================================

-- Migration: Extend dashboard_permissions with more granular controls
-- Purpose: Add more detailed permissions for dashboard features
-- Date: 2025-11-11

-- Add new columns for header/quick actions
ALTER TABLE dashboard_permissions
  ADD COLUMN IF NOT EXISTS show_quick_task_button BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_workspace_invitations BOOLEAN DEFAULT true;

-- Add individual stat cards permissions (more granular than show_stats_overview)
ALTER TABLE dashboard_permissions
  ADD COLUMN IF NOT EXISTS show_stat_todo_tasks BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_stat_overdue_tasks BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_stat_upcoming_tasks BOOLEAN DEFAULT true;

-- Add task table column visibility
ALTER TABLE dashboard_permissions
  ADD COLUMN IF NOT EXISTS show_task_title_column BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_task_project_column BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_task_assignees_column BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_task_status_column BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_task_priority_column BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_task_deadline_column BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_task_actions_column BOOLEAN DEFAULT true;

-- Add view mode controls
ALTER TABLE dashboard_permissions
  ADD COLUMN IF NOT EXISTS show_view_mode_toggle BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_calendar_view_toggle BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_list_view BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_calendar_view BOOLEAN DEFAULT true;

-- Add activity section controls
ALTER TABLE dashboard_permissions
  ADD COLUMN IF NOT EXISTS show_activity_view_all_link BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_activity_count BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS max_activities_displayed INTEGER DEFAULT 10;

-- Add task actions permissions
ALTER TABLE dashboard_permissions
  ADD COLUMN IF NOT EXISTS allow_task_edit BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_task_delete BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_task_status_change BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_task_priority_change BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_task_assignee_change BOOLEAN DEFAULT true;

-- Add filtering and sorting permissions
ALTER TABLE dashboard_permissions
  ADD COLUMN IF NOT EXISTS allow_task_filtering BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_task_sorting BOOLEAN DEFAULT true;

-- Add comments
COMMENT ON COLUMN dashboard_permissions.show_quick_task_button IS 'Show/hide quick task creation button in header';
COMMENT ON COLUMN dashboard_permissions.show_workspace_invitations IS 'Show/hide workspace invitations section';
COMMENT ON COLUMN dashboard_permissions.show_stat_todo_tasks IS 'Show/hide "Na spracovanie" stat card';
COMMENT ON COLUMN dashboard_permissions.show_stat_overdue_tasks IS 'Show/hide "Prešli deadline" stat card';
COMMENT ON COLUMN dashboard_permissions.show_stat_upcoming_tasks IS 'Show/hide "Blížia sa" stat card';
COMMENT ON COLUMN dashboard_permissions.show_task_title_column IS 'Show/hide task title column in table';
COMMENT ON COLUMN dashboard_permissions.show_task_project_column IS 'Show/hide project column in table';
COMMENT ON COLUMN dashboard_permissions.show_task_assignees_column IS 'Show/hide assignees column in table';
COMMENT ON COLUMN dashboard_permissions.show_task_status_column IS 'Show/hide status column in table';
COMMENT ON COLUMN dashboard_permissions.show_task_priority_column IS 'Show/hide priority column in table';
COMMENT ON COLUMN dashboard_permissions.show_task_deadline_column IS 'Show/hide deadline column in table';
COMMENT ON COLUMN dashboard_permissions.show_task_actions_column IS 'Show/hide actions column in table';
COMMENT ON COLUMN dashboard_permissions.show_view_mode_toggle IS 'Show/hide list/calendar view toggle';
COMMENT ON COLUMN dashboard_permissions.show_calendar_view_toggle IS 'Show/hide month/week calendar toggle';
COMMENT ON COLUMN dashboard_permissions.allow_list_view IS 'Allow user to use list view';
COMMENT ON COLUMN dashboard_permissions.allow_calendar_view IS 'Allow user to use calendar view';
COMMENT ON COLUMN dashboard_permissions.show_activity_view_all_link IS 'Show/hide "View all activities" link';
COMMENT ON COLUMN dashboard_permissions.show_activity_count IS 'Show/hide activity count badge';
COMMENT ON COLUMN dashboard_permissions.max_activities_displayed IS 'Maximum number of activities to display';
COMMENT ON COLUMN dashboard_permissions.allow_task_edit IS 'Allow user to edit tasks from dashboard';
COMMENT ON COLUMN dashboard_permissions.allow_task_delete IS 'Allow user to delete tasks from dashboard';
COMMENT ON COLUMN dashboard_permissions.allow_task_status_change IS 'Allow user to change task status';
COMMENT ON COLUMN dashboard_permissions.allow_task_priority_change IS 'Allow user to change task priority';
COMMENT ON COLUMN dashboard_permissions.allow_task_assignee_change IS 'Allow user to change task assignees';
COMMENT ON COLUMN dashboard_permissions.allow_task_filtering IS 'Allow user to filter tasks';
COMMENT ON COLUMN dashboard_permissions.allow_task_sorting IS 'Allow user to sort tasks';

-- Update helper function to include new fields
DROP FUNCTION IF EXISTS get_dashboard_permissions(UUID, UUID);

CREATE OR REPLACE FUNCTION get_dashboard_permissions(
  p_workspace_id UUID,
  p_user_id UUID
)
RETURNS TABLE (
  show_stats_overview BOOLEAN,
  show_tasks_section BOOLEAN,
  show_activities_section BOOLEAN,
  show_calendar_section BOOLEAN,
  show_projects_section BOOLEAN,
  show_clients_section BOOLEAN,
  show_tab_all_active BOOLEAN,
  show_tab_today BOOLEAN,
  show_tab_sent_to_client BOOLEAN,
  show_tab_in_progress BOOLEAN,
  show_tab_unassigned BOOLEAN,
  show_tab_overdue BOOLEAN,
  show_tab_upcoming BOOLEAN,
  show_stat_total_tasks BOOLEAN,
  show_stat_completed_tasks BOOLEAN,
  show_stat_in_progress_tasks BOOLEAN,
  show_stat_total_hours BOOLEAN,
  show_stat_completion_rate BOOLEAN,
  show_quick_task_button BOOLEAN,
  show_workspace_invitations BOOLEAN,
  show_stat_todo_tasks BOOLEAN,
  show_stat_overdue_tasks BOOLEAN,
  show_stat_upcoming_tasks BOOLEAN,
  show_task_title_column BOOLEAN,
  show_task_project_column BOOLEAN,
  show_task_assignees_column BOOLEAN,
  show_task_status_column BOOLEAN,
  show_task_priority_column BOOLEAN,
  show_task_deadline_column BOOLEAN,
  show_task_actions_column BOOLEAN,
  show_view_mode_toggle BOOLEAN,
  show_calendar_view_toggle BOOLEAN,
  allow_list_view BOOLEAN,
  allow_calendar_view BOOLEAN,
  show_activity_view_all_link BOOLEAN,
  show_activity_count BOOLEAN,
  max_activities_displayed INTEGER,
  allow_task_edit BOOLEAN,
  allow_task_delete BOOLEAN,
  allow_task_status_change BOOLEAN,
  allow_task_priority_change BOOLEAN,
  allow_task_assignee_change BOOLEAN,
  allow_task_filtering BOOLEAN,
  allow_task_sorting BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(dp.show_stats_overview, true),
    COALESCE(dp.show_tasks_section, true),
    COALESCE(dp.show_activities_section, true),
    COALESCE(dp.show_calendar_section, true),
    COALESCE(dp.show_projects_section, true),
    COALESCE(dp.show_clients_section, true),
    COALESCE(dp.show_tab_all_active, true),
    COALESCE(dp.show_tab_today, true),
    COALESCE(dp.show_tab_sent_to_client, true),
    COALESCE(dp.show_tab_in_progress, true),
    COALESCE(dp.show_tab_unassigned, true),
    COALESCE(dp.show_tab_overdue, true),
    COALESCE(dp.show_tab_upcoming, true),
    COALESCE(dp.show_stat_total_tasks, true),
    COALESCE(dp.show_stat_completed_tasks, true),
    COALESCE(dp.show_stat_in_progress_tasks, true),
    COALESCE(dp.show_stat_total_hours, true),
    COALESCE(dp.show_stat_completion_rate, true),
    COALESCE(dp.show_quick_task_button, true),
    COALESCE(dp.show_workspace_invitations, true),
    COALESCE(dp.show_stat_todo_tasks, true),
    COALESCE(dp.show_stat_overdue_tasks, true),
    COALESCE(dp.show_stat_upcoming_tasks, true),
    COALESCE(dp.show_task_title_column, true),
    COALESCE(dp.show_task_project_column, true),
    COALESCE(dp.show_task_assignees_column, true),
    COALESCE(dp.show_task_status_column, true),
    COALESCE(dp.show_task_priority_column, true),
    COALESCE(dp.show_task_deadline_column, true),
    COALESCE(dp.show_task_actions_column, true),
    COALESCE(dp.show_view_mode_toggle, true),
    COALESCE(dp.show_calendar_view_toggle, true),
    COALESCE(dp.allow_list_view, true),
    COALESCE(dp.allow_calendar_view, true),
    COALESCE(dp.show_activity_view_all_link, true),
    COALESCE(dp.show_activity_count, true),
    COALESCE(dp.max_activities_displayed, 10),
    COALESCE(dp.allow_task_edit, true),
    COALESCE(dp.allow_task_delete, true),
    COALESCE(dp.allow_task_status_change, true),
    COALESCE(dp.allow_task_priority_change, true),
    COALESCE(dp.allow_task_assignee_change, true),
    COALESCE(dp.allow_task_filtering, true),
    COALESCE(dp.allow_task_sorting, true)
  FROM dashboard_permissions dp
  WHERE dp.workspace_id = p_workspace_id 
    AND dp.user_id = p_user_id
  LIMIT 1;
  
  -- If no record exists, return defaults
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      true, true, true, true, true, true,  -- sections
      true, true, true, true, true, true, true,  -- tabs
      true, true, true, true, true,  -- stats
      true, true,  -- header
      true, true, true,  -- individual stats
      true, true, true, true, true, true, true,  -- columns
      true, true, true, true,  -- view modes
      true, true, 10,  -- activities
      true, true, true, true, true,  -- task actions
      true, true;  -- filtering/sorting
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_dashboard_permissions IS 
  'Returns dashboard permissions for a user in a workspace, with defaults if not set (extended version)';



-- ============================================
-- FILE: supabase/migrations/0071_add_dashboard_permissions_to_permissions_table.sql
-- ============================================

-- Migration: Add dashboard permissions to permissions table
-- Purpose: Allow roles to have dashboard-specific permissions
-- Date: 2025-01-XX

-- Insert dashboard permissions into permissions table
-- These permissions will be available for role assignment

INSERT INTO permissions (name, resource, action, description) VALUES
  -- Main dashboard access
  ('pages.view_dashboard', 'pages', 'view_dashboard', 'Prístup k dashboardu'),
  
  -- Dashboard sections
  ('dashboard.show_stats_overview', 'dashboard', 'show_stats_overview', 'Zobraziť prehľad štatistík'),
  ('dashboard.show_tasks_section', 'dashboard', 'show_tasks_section', 'Zobraziť sekciu úloh'),
  ('dashboard.show_activities_section', 'dashboard', 'show_activities_section', 'Zobraziť sekciu aktivít'),
  ('dashboard.show_calendar_section', 'dashboard', 'show_calendar_section', 'Zobraziť sekciu kalendára'),
  ('dashboard.show_projects_section', 'dashboard', 'show_projects_section', 'Zobraziť sekciu projektov'),
  ('dashboard.show_clients_section', 'dashboard', 'show_clients_section', 'Zobraziť sekciu klientov'),
  
  -- Task tabs
  ('dashboard.show_tab_all_active', 'dashboard', 'show_tab_all_active', 'Zobraziť tab Všetky aktívne'),
  ('dashboard.show_tab_today', 'dashboard', 'show_tab_today', 'Zobraziť tab Dnes'),
  ('dashboard.show_tab_sent_to_client', 'dashboard', 'show_tab_sent_to_client', 'Zobraziť tab Odoslané klientovi'),
  ('dashboard.show_tab_in_progress', 'dashboard', 'show_tab_in_progress', 'Zobraziť tab V riešení'),
  ('dashboard.show_tab_unassigned', 'dashboard', 'show_tab_unassigned', 'Zobraziť tab Nezadané'),
  ('dashboard.show_tab_overdue', 'dashboard', 'show_tab_overdue', 'Zobraziť tab Prešli deadline'),
  ('dashboard.show_tab_upcoming', 'dashboard', 'show_tab_upcoming', 'Zobraziť tab Blížia sa'),
  
  -- Stats
  ('dashboard.show_stat_total_tasks', 'dashboard', 'show_stat_total_tasks', 'Zobraziť štatistiku Celkový počet úloh'),
  ('dashboard.show_stat_completed_tasks', 'dashboard', 'show_stat_completed_tasks', 'Zobraziť štatistiku Dokončené úlohy'),
  ('dashboard.show_stat_in_progress_tasks', 'dashboard', 'show_stat_in_progress_tasks', 'Zobraziť štatistiku Úlohy v riešení'),
  ('dashboard.show_stat_total_hours', 'dashboard', 'show_stat_total_hours', 'Zobraziť štatistiku Celkový počet hodín'),
  ('dashboard.show_stat_completion_rate', 'dashboard', 'show_stat_completion_rate', 'Zobraziť štatistiku Miera dokončenia'),
  ('dashboard.show_stat_todo_tasks', 'dashboard', 'show_stat_todo_tasks', 'Zobraziť štatistiku Na spracovanie'),
  ('dashboard.show_stat_overdue_tasks', 'dashboard', 'show_stat_overdue_tasks', 'Zobraziť štatistiku Prešli deadline'),
  ('dashboard.show_stat_upcoming_tasks', 'dashboard', 'show_stat_upcoming_tasks', 'Zobraziť štatistiku Blížia sa'),
  
  -- Header/Actions
  ('dashboard.show_quick_task_button', 'dashboard', 'show_quick_task_button', 'Zobraziť tlačidlo Rýchla úloha'),
  ('dashboard.show_workspace_invitations', 'dashboard', 'show_workspace_invitations', 'Zobraziť pozvánky do workspace'),
  
  -- Task table columns
  ('dashboard.show_task_title_column', 'dashboard', 'show_task_title_column', 'Zobraziť stĺpec Názov úlohy'),
  ('dashboard.show_task_project_column', 'dashboard', 'show_task_project_column', 'Zobraziť stĺpec Projekt'),
  ('dashboard.show_task_assignees_column', 'dashboard', 'show_task_assignees_column', 'Zobraziť stĺpec Pridelené'),
  ('dashboard.show_task_status_column', 'dashboard', 'show_task_status_column', 'Zobraziť stĺpec Status'),
  ('dashboard.show_task_priority_column', 'dashboard', 'show_task_priority_column', 'Zobraziť stĺpec Priorita'),
  ('dashboard.show_task_deadline_column', 'dashboard', 'show_task_deadline_column', 'Zobraziť stĺpec Deadline'),
  ('dashboard.show_task_actions_column', 'dashboard', 'show_task_actions_column', 'Zobraziť stĺpec Akcie'),
  
  -- View modes
  ('dashboard.show_view_mode_toggle', 'dashboard', 'show_view_mode_toggle', 'Zobraziť prepínač zobrazenia'),
  ('dashboard.show_calendar_view_toggle', 'dashboard', 'show_calendar_view_toggle', 'Zobraziť prepínač kalendára'),
  ('dashboard.allow_list_view', 'dashboard', 'allow_list_view', 'Povoliť zobrazenie zoznamu'),
  ('dashboard.allow_calendar_view', 'dashboard', 'allow_calendar_view', 'Povoliť zobrazenie kalendára'),
  
  -- Activities
  ('dashboard.show_activity_view_all_link', 'dashboard', 'show_activity_view_all_link', 'Zobraziť odkaz Zobraziť všetky aktivity'),
  ('dashboard.show_activity_count', 'dashboard', 'show_activity_count', 'Zobraziť počet aktivít'),
  
  -- Task actions
  ('dashboard.allow_task_edit', 'dashboard', 'allow_task_edit', 'Povoliť úpravu úloh'),
  ('dashboard.allow_task_delete', 'dashboard', 'allow_task_delete', 'Povoliť mazanie úloh'),
  ('dashboard.allow_task_status_change', 'dashboard', 'allow_task_status_change', 'Povoliť zmenu statusu úloh'),
  ('dashboard.allow_task_priority_change', 'dashboard', 'allow_task_priority_change', 'Povoliť zmenu priority úloh'),
  ('dashboard.allow_task_assignee_change', 'dashboard', 'allow_task_assignee_change', 'Povoliť zmenu pridelených úloh'),
  
  -- Filtering/Sorting
  ('dashboard.allow_task_filtering', 'dashboard', 'allow_task_filtering', 'Povoliť filtrovanie úloh'),
  ('dashboard.allow_task_sorting', 'dashboard', 'allow_task_sorting', 'Povoliť triedenie úloh')
ON CONFLICT (name) DO NOTHING;



-- ============================================
-- FILE: supabase/migrations/0072_add_share_token_to_tasks.sql
-- ============================================

-- Migration: Add share_token to tasks table
-- Purpose: Allow tasks to be shared via public links

-- Add share_token column to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tasks_share_token ON tasks(share_token) WHERE share_token IS NOT NULL;

-- Add comment
COMMENT ON COLUMN tasks.share_token IS 'Unique token for sharing task via public link. NULL means task is not shared.';

-- Function to generate a unique share token
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS TEXT AS $$
DECLARE
  token TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- Generate a random token (32 characters, alphanumeric + base64url safe chars)
    token := encode(gen_random_bytes(24), 'base64');
    -- Replace URL-unsafe characters
    token := replace(replace(replace(token, '+', '-'), '/', '_'), '=', '');
    token := substring(token from 1 for 32);
    
    -- Check if token already exists
    SELECT EXISTS(SELECT 1 FROM tasks WHERE share_token = token) INTO exists_check;
    
    -- Exit loop if token is unique
    EXIT WHEN NOT exists_check;
  END LOOP;
  
  RETURN token;
END;
$$ LANGUAGE plpgsql;

-- Verify the change
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tasks' 
  AND column_name = 'share_token';



-- ============================================
-- FILE: supabase/migrations/0073_add_public_access_for_shared_tasks.sql
-- ============================================

-- Migration: Add public access for shared tasks
-- Purpose: Allow anonymous users to access shared tasks via realtime subscriptions

-- Policy for anonymous users to view shared tasks (for realtime subscriptions)
CREATE POLICY "Anonymous users can view shared tasks" ON tasks
  FOR SELECT 
  TO anon
  USING (share_token IS NOT NULL);

-- Policy for anonymous users to view shared task checklist items
CREATE POLICY "Anonymous users can view shared task checklist" ON task_checklist_items
  FOR SELECT 
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = task_checklist_items.task_id 
      AND tasks.share_token IS NOT NULL
    )
  );

-- Policy for anonymous users to view shared task comments
CREATE POLICY "Anonymous users can view shared task comments" ON task_comments
  FOR SELECT 
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = task_comments.task_id 
      AND tasks.share_token IS NOT NULL
    )
  );

-- Policy for anonymous users to view shared task Google Drive links
CREATE POLICY "Anonymous users can view shared task drive links" ON google_drive_links
  FOR SELECT 
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = google_drive_links.task_id 
      AND tasks.share_token IS NOT NULL
    )
  );

-- Grant usage on schema to anon (required for realtime)
GRANT USAGE ON SCHEMA public TO anon;

-- Policy for anonymous users to view profiles of users who commented on shared tasks
CREATE POLICY "Anonymous users can view shared task commenter profiles" ON profiles
  FOR SELECT 
  TO anon
  USING (
    id IN (
      SELECT DISTINCT user_id 
      FROM task_comments 
      WHERE task_id IN (
        SELECT id FROM tasks WHERE share_token IS NOT NULL
      )
    )
  );

-- Grant SELECT on tables to anon (required for realtime subscriptions)
GRANT SELECT ON tasks TO anon;
GRANT SELECT ON task_checklist_items TO anon;
GRANT SELECT ON task_comments TO anon;
GRANT SELECT ON google_drive_links TO anon;
GRANT SELECT ON profiles TO anon;

-- Add comment
COMMENT ON POLICY "Anonymous users can view shared tasks" ON tasks IS 
  'Allows anonymous users to view tasks that have a share_token, enabling realtime subscriptions for public shared task links';



-- ============================================
-- FILE: supabase/migrations/0074_add_task_updated_at_triggers.sql
-- ============================================

-- Add triggers to automatically update tasks.updated_at when related data changes
-- This ensures that public share links get updated when checklist, comments, links, or files change

-- Function to automatically update tasks.updated_at on UPDATE
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for tasks table UPDATE
DROP TRIGGER IF EXISTS trigger_update_tasks_updated_at ON tasks;
CREATE TRIGGER trigger_update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_tasks_updated_at();

-- Function to update tasks.updated_at when related tables change
CREATE OR REPLACE FUNCTION update_task_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the parent task's updated_at timestamp
  UPDATE tasks
  SET updated_at = NOW()
  WHERE id = (
    CASE
      WHEN TG_TABLE_NAME = 'task_checklist_items' THEN NEW.task_id
      WHEN TG_TABLE_NAME = 'task_comments' THEN NEW.task_id
      WHEN TG_TABLE_NAME = 'google_drive_links' THEN NEW.task_id
      ELSE NULL
    END
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update tasks.updated_at on DELETE
CREATE OR REPLACE FUNCTION update_task_updated_at_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the parent task's updated_at timestamp
  UPDATE tasks
  SET updated_at = NOW()
  WHERE id = (
    CASE
      WHEN TG_TABLE_NAME = 'task_checklist_items' THEN OLD.task_id
      WHEN TG_TABLE_NAME = 'task_comments' THEN OLD.task_id
      WHEN TG_TABLE_NAME = 'google_drive_links' THEN OLD.task_id
      ELSE NULL
    END
  );
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger for task_checklist_items INSERT/UPDATE
DROP TRIGGER IF EXISTS trigger_update_task_on_checklist_change ON task_checklist_items;
CREATE TRIGGER trigger_update_task_on_checklist_change
  AFTER INSERT OR UPDATE ON task_checklist_items
  FOR EACH ROW
  EXECUTE FUNCTION update_task_updated_at();

-- Trigger for task_checklist_items DELETE
DROP TRIGGER IF EXISTS trigger_update_task_on_checklist_delete ON task_checklist_items;
CREATE TRIGGER trigger_update_task_on_checklist_delete
  AFTER DELETE ON task_checklist_items
  FOR EACH ROW
  EXECUTE FUNCTION update_task_updated_at_on_delete();

-- Trigger for task_comments INSERT/UPDATE
DROP TRIGGER IF EXISTS trigger_update_task_on_comment_change ON task_comments;
CREATE TRIGGER trigger_update_task_on_comment_change
  AFTER INSERT OR UPDATE ON task_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_task_updated_at();

-- Trigger for task_comments DELETE
DROP TRIGGER IF EXISTS trigger_update_task_on_comment_delete ON task_comments;
CREATE TRIGGER trigger_update_task_on_comment_delete
  AFTER DELETE ON task_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_task_updated_at_on_delete();

-- Trigger for google_drive_links INSERT/UPDATE
DROP TRIGGER IF EXISTS trigger_update_task_on_link_change ON google_drive_links;
CREATE TRIGGER trigger_update_task_on_link_change
  AFTER INSERT OR UPDATE ON google_drive_links
  FOR EACH ROW
  EXECUTE FUNCTION update_task_updated_at();

-- Trigger for google_drive_links DELETE
DROP TRIGGER IF EXISTS trigger_update_task_on_link_delete ON google_drive_links;
CREATE TRIGGER trigger_update_task_on_link_delete
  AFTER DELETE ON google_drive_links
  FOR EACH ROW
  EXECUTE FUNCTION update_task_updated_at_on_delete();

-- Add comments to explain the triggers
COMMENT ON TRIGGER trigger_update_tasks_updated_at ON tasks IS 'Automatically updates tasks.updated_at when task data changes';
COMMENT ON TRIGGER trigger_update_task_on_checklist_change ON task_checklist_items IS 'Automatically updates tasks.updated_at when checklist items change';
COMMENT ON TRIGGER trigger_update_task_on_checklist_delete ON task_checklist_items IS 'Automatically updates tasks.updated_at when checklist items are deleted';
COMMENT ON TRIGGER trigger_update_task_on_comment_change ON task_comments IS 'Automatically updates tasks.updated_at when comments change';
COMMENT ON TRIGGER trigger_update_task_on_comment_delete ON task_comments IS 'Automatically updates tasks.updated_at when comments are deleted';
COMMENT ON TRIGGER trigger_update_task_on_link_change ON google_drive_links IS 'Automatically updates tasks.updated_at when Google Drive links change';
COMMENT ON TRIGGER trigger_update_task_on_link_delete ON google_drive_links IS 'Automatically updates tasks.updated_at when Google Drive links are deleted';



-- ============================================
-- FILE: supabase/migrations/0075_create_project_quick_links.sql
-- ============================================

-- Create project_quick_links table
CREATE TABLE IF NOT EXISTS project_quick_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE project_quick_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view project quick links for their workspace projects"
  ON project_quick_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE p.id = project_quick_links.project_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert project quick links for their workspace projects"
  ON project_quick_links FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE p.id = project_quick_links.project_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update project quick links for their workspace projects"
  ON project_quick_links FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE p.id = project_quick_links.project_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete project quick links for their workspace projects"
  ON project_quick_links FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE p.id = project_quick_links.project_id
      AND wm.user_id = auth.uid()
    )
  );

-- Create index
CREATE INDEX idx_project_quick_links_project_id ON project_quick_links(project_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_project_quick_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_quick_links_updated_at
  BEFORE UPDATE ON project_quick_links
  FOR EACH ROW
  EXECUTE FUNCTION update_project_quick_links_updated_at();

-- Add comment for documentation
COMMENT ON TABLE project_quick_links IS 'Quick links for projects (e.g., Google Drive folders, documents, etc.)';



-- ============================================
-- FILE: supabase/migrations/0076_add_sales_commission_to_tasks.sql
-- ============================================

-- Migration: Add sales commission columns to tasks table
-- Purpose: Allow storing sales commission settings for tasks

-- Add sales_commission_enabled column
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS sales_commission_enabled BOOLEAN DEFAULT FALSE;

-- Add sales_commission_user_id column
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS sales_commission_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Add sales_commission_percent column
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS sales_commission_percent NUMERIC(5, 2);

-- Add comments for documentation
COMMENT ON COLUMN tasks.sales_commission_enabled IS 'Whether sales commission is enabled for this task';
COMMENT ON COLUMN tasks.sales_commission_user_id IS 'ID of the sales person who should receive commission';
COMMENT ON COLUMN tasks.sales_commission_percent IS 'Percentage of budget to be paid as commission (0-100)';

-- Verify the columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tasks' 
  AND column_name IN ('sales_commission_enabled', 'sales_commission_user_id', 'sales_commission_percent');



-- ============================================
-- FILE: supabase/migrations/0077_add_is_extra_to_task_timers.sql
-- ============================================

-- Migration: Add is_extra field to task_timers table
-- Purpose: Track whether a timer is tracking extra (non-billable) time

-- Add is_extra column to task_timers table
ALTER TABLE task_timers 
ADD COLUMN IF NOT EXISTS is_extra BOOLEAN NOT NULL DEFAULT false;

-- Create index for faster queries on is_extra
CREATE INDEX IF NOT EXISTS idx_task_timers_is_extra ON task_timers(is_extra);

-- Add comment
COMMENT ON COLUMN task_timers.is_extra IS 'Indicates whether this timer is tracking extra (non-billable) time';



-- ============================================
-- FILE: supabase/migrations/0078_create_exec_sql_function.sql
-- ============================================

-- Migration: Create exec_sql function for executing SQL dynamically
-- Purpose: Allow API to execute SQL commands safely

-- Create function to execute SQL (admin only)
-- WARNING: This function allows executing arbitrary SQL - use with caution!
CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Only allow execution if called with service role key
  -- This is enforced by RLS and security definer
  
  -- Execute the SQL query
  EXECUTE sql_query;
  
  -- Return success
  RETURN json_build_object(
    'success', true,
    'message', 'SQL executed successfully'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permission to service role (authenticated via service role key)
-- Note: This function should only be accessible via service role key
GRANT EXECUTE ON FUNCTION exec_sql(text) TO service_role;

-- Add comment
COMMENT ON FUNCTION exec_sql(text) IS 'Executes SQL query dynamically. WARNING: Use with extreme caution! Only accessible via service role key.';




-- ============================================
-- FILE: supabase/migrations/0079_add_project_scoped_workspace_invitations.sql
-- ============================================

-- Add project-scoped workspace access and project selection on invitations

-- 1) Workspace members can be unrestricted (all projects) or restricted (selected projects)
ALTER TABLE workspace_members
  ADD COLUMN IF NOT EXISTS project_access_scope TEXT NOT NULL DEFAULT 'all';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'workspace_members_project_access_scope_check'
  ) THEN
    ALTER TABLE workspace_members
      ADD CONSTRAINT workspace_members_project_access_scope_check
      CHECK (project_access_scope IN ('all', 'restricted'));
  END IF;
END $$;

COMMENT ON COLUMN workspace_members.project_access_scope IS
  'all = member can see all workspace projects, restricted = only projects in project_members';

-- 2) Workspace invitation can optionally carry selected project IDs
ALTER TABLE workspace_invitations
  ADD COLUMN IF NOT EXISTS project_ids JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN workspace_invitations.project_ids IS
  'Optional list of project UUIDs user should access after accepting invitation';

-- 3) Ensure project_members table exists for scoped access
CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  hourly_rate NUMERIC(10,2),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);


-- ============================================
-- FILE: supabase/migrations/0080_allow_custom_role_ids_in_workspace_invitations.sql
-- ============================================

-- Allow workspace invitations to carry custom role IDs (UUID)
-- Existing flow stores system roles as text ("owner", "admin", "member")
-- and custom roles as roles.id UUID string.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'workspace_invitations_role_check'
  ) THEN
    ALTER TABLE workspace_invitations
      DROP CONSTRAINT workspace_invitations_role_check;
  END IF;
END $$;

ALTER TABLE workspace_invitations
  ADD CONSTRAINT workspace_invitations_role_check
  CHECK (
    role IN ('owner', 'admin', 'member')
    OR role ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  );


-- ============================================
-- FILE: supabase/migrations/0081_allow_workspace_invitation_accept_in_member_trigger.sql
-- ============================================

-- Allow accepting workspace invitations while keeping protection against unauthorized inserts.
-- Existing trigger only allows workspace owners to insert into workspace_members.
-- Invitation acceptance runs as invited user (or service role backend), so it must be allowed.

CREATE OR REPLACE FUNCTION prevent_unauthorized_workspace_member_addition()
RETURNS TRIGGER AS $$
DECLARE
  request_user_id UUID := auth.uid();
  request_role TEXT := auth.role();
BEGIN
  -- Backend service role can manage inserts.
  IF request_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Workspace owner can add members.
  IF EXISTS (
    SELECT 1
    FROM workspaces
    WHERE id = NEW.workspace_id
      AND owner_id = request_user_id
  ) THEN
    RETURN NEW;
  END IF;

  -- Allow membership creation when there is a valid pending invitation
  -- for the same user/workspace pair (covers server-side accept flow too).
  IF EXISTS (
    SELECT 1
    FROM workspace_invitations wi
    JOIN profiles p ON p.id = NEW.user_id
    WHERE wi.workspace_id = NEW.workspace_id
      AND wi.status = 'pending'
      AND wi.expires_at > NOW()
      AND LOWER(wi.email) = LOWER(COALESCE(p.email, ''))
  ) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION
    'Unauthorized attempt to add user to workspace: User % attempted to add user % to workspace % without being owner',
    request_user_id,
    NEW.user_id,
    NEW.workspace_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- FILE: supabase/migrations/0082_add_task_color_to_tasks.sql
-- ============================================

-- Add optional HEX color highlight for tasks

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS color TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tasks_color_hex_check'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT tasks_color_hex_check
      CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$');
  END IF;
END $$;

COMMENT ON COLUMN tasks.color IS
  'Optional highlight color for task UI in HEX format #RRGGBB';


-- ============================================
-- FILE: supabase/migrations/0083_add_currency_to_tasks.sql
-- ============================================

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'EUR';

UPDATE tasks
SET currency = COALESCE(
  (
    SELECT p.currency
    FROM projects p
    WHERE p.id = tasks.project_id
  ),
  'EUR'
)
WHERE currency IS NULL OR currency = '';

COMMENT ON COLUMN tasks.currency IS 'Mena úlohy (EUR alebo USD)';


-- ============================================
-- FILE: supabase/migrations/20260109_add_timer_description.sql
-- ============================================

-- Add description column to task_timers table
ALTER TABLE task_timers 
ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';

-- Add comment
COMMENT ON COLUMN task_timers.description IS 'Optional description of what user is working on during this timer session';


