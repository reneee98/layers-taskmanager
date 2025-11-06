-- Migration: Fix task_comments RLS to use comments permissions
-- Purpose: Update RLS policies for task_comments to use comments.* permissions instead of tasks.update

-- Drop existing policies (both old and new ones)
DROP POLICY IF EXISTS "Users with tasks.read can view task comments" ON task_comments;
DROP POLICY IF EXISTS "Users with tasks.update can create task comments" ON task_comments;
DROP POLICY IF EXISTS "Users with tasks.update can update task comments" ON task_comments;
DROP POLICY IF EXISTS "Users with tasks.update can delete task comments" ON task_comments;
DROP POLICY IF EXISTS "Users with comments.read can view task comments" ON task_comments;
DROP POLICY IF EXISTS "Users with comments.create can create task comments" ON task_comments;
DROP POLICY IF EXISTS "Users with comments.update can update task comments" ON task_comments;
DROP POLICY IF EXISTS "Users with comments.delete can delete task comments" ON task_comments;
DROP POLICY IF EXISTS "Users can delete own comments with delete permission" ON task_comments;
DROP POLICY IF EXISTS "Users with manage permission can delete any comment" ON task_comments;

-- Task comments: SELECT - check 'comments.read' permission
CREATE POLICY "Users with comments.read can view task comments" ON task_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = task_comments.task_id
        AND has_permission(auth.uid(), 'comments', 'read', p.workspace_id) = TRUE
    )
  );

-- Task comments: INSERT - check 'comments.create' permission
CREATE POLICY "Users with comments.create can create task comments" ON task_comments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = task_comments.task_id
        AND has_permission(auth.uid(), 'comments', 'create', p.workspace_id) = TRUE
    )
  );

-- Task comments: UPDATE - check 'comments.update' permission
-- Users can update their own comments if they have 'comments.update' permission
-- Users can update any comment if they have 'comments.manage' permission
CREATE POLICY "Users with comments.update can update task comments" ON task_comments
  FOR UPDATE USING (
    -- Check if user can update their own comment
    (task_comments.user_id = auth.uid() 
     AND EXISTS (
       SELECT 1 FROM tasks t
       JOIN projects p ON t.project_id = p.id
       WHERE t.id = task_comments.task_id
         AND has_permission(auth.uid(), 'comments', 'update', p.workspace_id) = TRUE
     ))
    OR
    -- Check if user can update any comment (has manage permission)
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = task_comments.task_id
        AND has_permission(auth.uid(), 'comments', 'manage', p.workspace_id) = TRUE
    )
  ) WITH CHECK (
    -- Check if user can update their own comment
    (task_comments.user_id = auth.uid() 
     AND EXISTS (
       SELECT 1 FROM tasks t
       JOIN projects p ON t.project_id = p.id
       WHERE t.id = task_comments.task_id
         AND has_permission(auth.uid(), 'comments', 'update', p.workspace_id) = TRUE
     ))
    OR
    -- Check if user can update any comment (has manage permission)
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = task_comments.task_id
        AND has_permission(auth.uid(), 'comments', 'manage', p.workspace_id) = TRUE
    )
  );

-- Task comments: DELETE - two separate policies for clarity
-- Policy 1: Users can delete their own comments if they have 'comments.delete' permission
CREATE POLICY "Users can delete own comments with delete permission" ON task_comments
  FOR DELETE USING (
    task_comments.user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = task_comments.task_id
        AND has_permission(auth.uid(), 'comments', 'delete', p.workspace_id) = TRUE
    )
  );

-- Policy 2: Users can delete any comment if they have 'comments.manage' permission
CREATE POLICY "Users with manage permission can delete any comment" ON task_comments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = task_comments.task_id
        AND has_permission(auth.uid(), 'comments', 'manage', p.workspace_id) = TRUE
    )
  );

