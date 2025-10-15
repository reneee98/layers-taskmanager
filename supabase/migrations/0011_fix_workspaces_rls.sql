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
