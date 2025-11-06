-- Migration: Make RLS policies use has_permission function
-- Purpose: Make RLS policies check permissions from role management system
-- This ensures that permissions set in role management override hardcoded RLS policies

-- Helper function to get workspace_id from a project
CREATE OR REPLACE FUNCTION get_project_workspace_id(p_project_id UUID)
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT workspace_id FROM projects WHERE id = p_project_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get workspace_id from a task
CREATE OR REPLACE FUNCTION get_task_workspace_id(p_task_id UUID)
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT p.workspace_id 
    FROM tasks t
    JOIN projects p ON t.project_id = p.id
    WHERE t.id = p_task_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get workspace_id from a time_entry
CREATE OR REPLACE FUNCTION get_time_entry_workspace_id(p_time_entry_id UUID)
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT p.workspace_id 
    FROM time_entries te
    JOIN tasks t ON te.task_id = t.id
    JOIN projects p ON t.project_id = p.id
    WHERE te.id = p_time_entry_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PROJECTS RLS POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Owners can manage projects" ON projects;
DROP POLICY IF EXISTS "Members can view projects" ON projects;
DROP POLICY IF EXISTS "Workspace members can manage projects" ON projects;

-- Projects: SELECT - check 'projects.read' permission
CREATE POLICY "Users with projects.read can view projects" ON projects
  FOR SELECT USING (
    has_permission(auth.uid(), 'projects', 'read', workspace_id) = TRUE
  );

-- Projects: INSERT - check 'projects.create' permission
CREATE POLICY "Users with projects.create can create projects" ON projects
  FOR INSERT WITH CHECK (
    has_permission(auth.uid(), 'projects', 'create', workspace_id) = TRUE
  );

-- Projects: UPDATE - check 'projects.update' permission
CREATE POLICY "Users with projects.update can update projects" ON projects
  FOR UPDATE USING (
    has_permission(auth.uid(), 'projects', 'update', workspace_id) = TRUE
  );

-- Projects: DELETE - check 'projects.delete' permission
CREATE POLICY "Users with projects.delete can delete projects" ON projects
  FOR DELETE USING (
    has_permission(auth.uid(), 'projects', 'delete', workspace_id) = TRUE
  );

-- ============================================
-- TASKS RLS POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Owners can manage tasks" ON tasks;
DROP POLICY IF EXISTS "Workspace members can manage tasks" ON tasks;

-- Tasks: SELECT - check 'tasks.read' permission
CREATE POLICY "Users with tasks.read can view tasks" ON tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = tasks.project_id
        AND has_permission(auth.uid(), 'tasks', 'read', p.workspace_id) = TRUE
    )
  );

-- Tasks: INSERT - check 'tasks.create' permission
CREATE POLICY "Users with tasks.create can create tasks" ON tasks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = tasks.project_id
        AND has_permission(auth.uid(), 'tasks', 'create', p.workspace_id) = TRUE
    )
  );

-- Tasks: UPDATE - check 'tasks.update' permission
CREATE POLICY "Users with tasks.update can update tasks" ON tasks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = tasks.project_id
        AND has_permission(auth.uid(), 'tasks', 'update', p.workspace_id) = TRUE
    )
  );

-- Tasks: DELETE - check 'tasks.delete' permission
CREATE POLICY "Users with tasks.delete can delete tasks" ON tasks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = tasks.project_id
        AND has_permission(auth.uid(), 'tasks', 'delete', p.workspace_id) = TRUE
    )
  );

-- ============================================
-- TIME ENTRIES RLS POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Owners can manage time entries" ON time_entries;
DROP POLICY IF EXISTS "Workspace members can manage time entries" ON time_entries;

-- Time entries: SELECT - check 'time_entries.read' permission
CREATE POLICY "Users with time_entries.read can view time entries" ON time_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = time_entries.task_id
        AND has_permission(auth.uid(), 'time_entries', 'read', p.workspace_id) = TRUE
    )
  );

-- Time entries: INSERT - check 'time_entries.create' permission
CREATE POLICY "Users with time_entries.create can create time entries" ON time_entries
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = time_entries.task_id
        AND has_permission(auth.uid(), 'time_entries', 'create', p.workspace_id) = TRUE
    )
  );

-- Time entries: UPDATE - check 'time_entries.update' permission
CREATE POLICY "Users with time_entries.update can update time entries" ON time_entries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = time_entries.task_id
        AND has_permission(auth.uid(), 'time_entries', 'update', p.workspace_id) = TRUE
    )
  );

-- Time entries: DELETE - check 'time_entries.delete' permission
CREATE POLICY "Users with time_entries.delete can delete time entries" ON time_entries
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = time_entries.task_id
        AND has_permission(auth.uid(), 'time_entries', 'delete', p.workspace_id) = TRUE
    )
  );

-- ============================================
-- CLIENTS RLS POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Workspace members can manage clients" ON clients;

-- Clients: SELECT - check 'clients.read' permission
CREATE POLICY "Users with clients.read can view clients" ON clients
  FOR SELECT USING (
    has_permission(auth.uid(), 'clients', 'read', workspace_id) = TRUE
  );

-- Clients: INSERT - check 'clients.create' permission
CREATE POLICY "Users with clients.create can create clients" ON clients
  FOR INSERT WITH CHECK (
    has_permission(auth.uid(), 'clients', 'create', workspace_id) = TRUE
  );

-- Clients: UPDATE - check 'clients.update' permission
CREATE POLICY "Users with clients.update can update clients" ON clients
  FOR UPDATE USING (
    has_permission(auth.uid(), 'clients', 'update', workspace_id) = TRUE
  );

-- Clients: DELETE - check 'clients.delete' permission
CREATE POLICY "Users with clients.delete can delete clients" ON clients
  FOR DELETE USING (
    has_permission(auth.uid(), 'clients', 'delete', workspace_id) = TRUE
  );

-- ============================================
-- INVOICES RLS POLICIES (if invoices table exists)
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Owners can manage invoices" ON invoices;
DROP POLICY IF EXISTS "Workspace members can view invoices" ON invoices;

-- Invoices: SELECT - check 'invoices.read' permission
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'invoices') THEN
    EXECUTE '
      CREATE POLICY "Users with invoices.read can view invoices" ON invoices
        FOR SELECT USING (
          has_permission(auth.uid(), ''invoices'', ''read'', workspace_id) = TRUE
        )';
  END IF;
END $$;

-- Invoices: INSERT - check 'invoices.create' permission
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'invoices') THEN
    EXECUTE '
      CREATE POLICY "Users with invoices.create can create invoices" ON invoices
        FOR INSERT WITH CHECK (
          has_permission(auth.uid(), ''invoices'', ''create'', workspace_id) = TRUE
        )';
  END IF;
END $$;

-- Invoices: UPDATE - check 'invoices.update' permission
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'invoices') THEN
    EXECUTE '
      CREATE POLICY "Users with invoices.update can update invoices" ON invoices
        FOR UPDATE USING (
          has_permission(auth.uid(), ''invoices'', ''update'', workspace_id) = TRUE
        )';
  END IF;
END $$;

-- Invoices: DELETE - check 'invoices.delete' permission
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'invoices') THEN
    EXECUTE '
      CREATE POLICY "Users with invoices.delete can delete invoices" ON invoices
        FOR DELETE USING (
          has_permission(auth.uid(), ''invoices'', ''delete'', workspace_id) = TRUE
        )';
  END IF;
END $$;

-- ============================================
-- COSTS RLS POLICIES (if costs table exists)
-- ============================================

-- Note: Costs might be in a different table structure, adjust as needed
-- This is a placeholder - adjust based on your actual costs table structure

-- ============================================
-- COMMENTS RLS POLICIES (if task_comments table exists)
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Owners can manage task comments" ON task_comments;
DROP POLICY IF EXISTS "Workspace members can manage task comments" ON task_comments;

-- Task comments: SELECT - check 'tasks.read' permission (comments are part of tasks)
CREATE POLICY "Users with tasks.read can view task comments" ON task_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = task_comments.task_id
        AND has_permission(auth.uid(), 'tasks', 'read', p.workspace_id) = TRUE
    )
  );

-- Task comments: INSERT - check 'tasks.update' permission (creating comments is updating task)
CREATE POLICY "Users with tasks.update can create task comments" ON task_comments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = task_comments.task_id
        AND has_permission(auth.uid(), 'tasks', 'update', p.workspace_id) = TRUE
    )
  );

-- Task comments: UPDATE - check 'tasks.update' permission
CREATE POLICY "Users with tasks.update can update task comments" ON task_comments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = task_comments.task_id
        AND has_permission(auth.uid(), 'tasks', 'update', p.workspace_id) = TRUE
    )
  );

-- Task comments: DELETE - check 'tasks.update' permission
CREATE POLICY "Users with tasks.update can delete task comments" ON task_comments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = task_comments.task_id
        AND has_permission(auth.uid(), 'tasks', 'update', p.workspace_id) = TRUE
    )
  );

-- ============================================
-- TASK ASSIGNEES RLS POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Owners can manage task assignees" ON task_assignees;
DROP POLICY IF EXISTS "Workspace members can manage task assignees" ON task_assignees;

-- Task assignees: SELECT - check 'tasks.read' permission
CREATE POLICY "Users with tasks.read can view task assignees" ON task_assignees
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = task_assignees.task_id
        AND has_permission(auth.uid(), 'tasks', 'read', p.workspace_id) = TRUE
    )
  );

-- Task assignees: INSERT - check 'tasks.update' permission
CREATE POLICY "Users with tasks.update can create task assignees" ON task_assignees
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = task_assignees.task_id
        AND has_permission(auth.uid(), 'tasks', 'update', p.workspace_id) = TRUE
    )
  );

-- Task assignees: DELETE - check 'tasks.update' permission
CREATE POLICY "Users with tasks.update can delete task assignees" ON task_assignees
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = task_assignees.task_id
        AND has_permission(auth.uid(), 'tasks', 'update', p.workspace_id) = TRUE
    )
  );

-- Note: This migration makes RLS policies check permissions from the role management system.
-- Permissions set in the role management interface will now override hardcoded RLS policies.
-- The has_permission function checks:
-- 1. If user is admin (has all permissions)
-- 2. If user is workspace owner (has all permissions in their workspace)
-- 3. Custom roles assigned to user
-- 4. Role from workspace_members table

