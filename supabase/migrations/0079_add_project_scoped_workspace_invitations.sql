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
