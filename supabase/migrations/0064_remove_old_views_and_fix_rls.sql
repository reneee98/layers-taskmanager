-- Migration: Remove old views that bypass permissions system and ensure all RLS policies use has_permission
-- Purpose: Ensure permissions are the ultimate authority, not old views or policies

-- Drop old views that bypass permissions system
DROP VIEW IF EXISTS member_projects_view CASCADE;
DROP VIEW IF EXISTS member_clients_view CASCADE;

-- Drop any old policies that might still exist and bypass permissions
DROP POLICY IF EXISTS "Members can view projects" ON projects;
DROP POLICY IF EXISTS "Owners can manage projects" ON projects;
DROP POLICY IF EXISTS "Workspace members can manage projects" ON projects;
DROP POLICY IF EXISTS "Members can view clients" ON clients;
DROP POLICY IF EXISTS "Owners can manage clients" ON clients;
DROP POLICY IF EXISTS "Workspace members can manage clients" ON clients;
DROP POLICY IF EXISTS "Owners can manage tasks" ON tasks;
DROP POLICY IF EXISTS "Workspace members can manage tasks" ON tasks;
DROP POLICY IF EXISTS "Owners can manage time entries" ON time_entries;
DROP POLICY IF EXISTS "Workspace members can manage time entries" ON time_entries;
DROP POLICY IF EXISTS "Owners can manage task comments" ON task_comments;
DROP POLICY IF EXISTS "Workspace members can manage task comments" ON task_comments;
DROP POLICY IF EXISTS "Owners can manage task assignees" ON task_assignees;
DROP POLICY IF EXISTS "Workspace members can manage task assignees" ON task_assignees;

-- Ensure RLS is enabled on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Verify that all policies use has_permission (these should already exist from migration 0062, but we ensure they're the only ones)
-- Projects policies (should already exist from 0062)
DO $$
BEGIN
  -- Check if policies exist, if not create them
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'projects' 
    AND policyname = 'Users with projects.read can view projects'
  ) THEN
    CREATE POLICY "Users with projects.read can view projects" ON projects
      FOR SELECT USING (
        has_permission(auth.uid(), 'projects', 'read', workspace_id) = TRUE
      );
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'projects' 
    AND policyname = 'Users with projects.create can create projects'
  ) THEN
    CREATE POLICY "Users with projects.create can create projects" ON projects
      FOR INSERT WITH CHECK (
        has_permission(auth.uid(), 'projects', 'create', workspace_id) = TRUE
      );
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'projects' 
    AND policyname = 'Users with projects.update can update projects'
  ) THEN
    CREATE POLICY "Users with projects.update can update projects" ON projects
      FOR UPDATE USING (
        has_permission(auth.uid(), 'projects', 'update', workspace_id) = TRUE
      );
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'projects' 
    AND policyname = 'Users with projects.delete can delete projects'
  ) THEN
    CREATE POLICY "Users with projects.delete can delete projects" ON projects
      FOR DELETE USING (
        has_permission(auth.uid(), 'projects', 'delete', workspace_id) = TRUE
      );
  END IF;
END $$;

-- Tasks policies (should already exist from 0062)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'tasks' 
    AND policyname = 'Users with tasks.read can view tasks'
  ) THEN
    CREATE POLICY "Users with tasks.read can view tasks" ON tasks
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM projects p
          WHERE p.id = tasks.project_id
            AND has_permission(auth.uid(), 'tasks', 'read', p.workspace_id) = TRUE
        )
      );
  END IF;
END $$;

-- Clients policies (should already exist from 0062)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'clients' 
    AND policyname = 'Users with clients.read can view clients'
  ) THEN
    CREATE POLICY "Users with clients.read can view clients" ON clients
      FOR SELECT USING (
        has_permission(auth.uid(), 'clients', 'read', workspace_id) = TRUE
      );
  END IF;
END $$;

-- Add comment
COMMENT ON SCHEMA public IS 'All RLS policies now use has_permission function. Permissions from role management system are the ultimate authority.';

