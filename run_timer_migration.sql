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
DROP POLICY IF EXISTS "Workspace members can view their own timers" ON task_timers;
DROP POLICY IF EXISTS "Workspace members can insert their own timers" ON task_timers;
DROP POLICY IF EXISTS "Workspace members can update their own timers" ON task_timers;
DROP POLICY IF EXISTS "Workspace members can delete their own timers" ON task_timers;

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

