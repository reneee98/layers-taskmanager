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

-- Grant SELECT on tables to anon (required for realtime subscriptions)
GRANT SELECT ON tasks TO anon;
GRANT SELECT ON task_checklist_items TO anon;
GRANT SELECT ON task_comments TO anon;
GRANT SELECT ON google_drive_links TO anon;

-- Add comment
COMMENT ON POLICY "Anonymous users can view shared tasks" ON tasks IS 
  'Allows anonymous users to view tasks that have a share_token, enabling realtime subscriptions for public shared task links';

