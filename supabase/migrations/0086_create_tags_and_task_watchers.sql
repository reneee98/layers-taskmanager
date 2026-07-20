-- ============================================================
-- Migration: Tags system + Task watchers
-- ============================================================

-- 1. Tags table (workspace-scoped, reusable)
CREATE TABLE IF NOT EXISTS tags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#6366f1',  -- tailwind indigo-500
  created_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tags_name_workspace_unique UNIQUE (workspace_id, name),
  CONSTRAINT tags_color_hex_check CHECK (color ~ '^#[0-9A-Fa-f]{6}$')
);

CREATE INDEX IF NOT EXISTS idx_tags_workspace_id ON tags(workspace_id);

COMMENT ON TABLE tags IS 'Reusable tags/labels scoped to a workspace';

-- 2. Task-tag junction table
CREATE TABLE IF NOT EXISTS task_tags (
  task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id      UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  added_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (task_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_task_tags_task_id ON task_tags(task_id);
CREATE INDEX IF NOT EXISTS idx_task_tags_tag_id  ON task_tags(tag_id);

COMMENT ON TABLE task_tags IS 'Many-to-many join between tasks and tags';

-- 3. Task watchers (who wants notifications for a task)
CREATE TABLE IF NOT EXISTS task_watchers (
  task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_watchers_task_id ON task_watchers(task_id);
CREATE INDEX IF NOT EXISTS idx_task_watchers_user_id ON task_watchers(user_id);

COMMENT ON TABLE task_watchers IS 'Users who watch a task (want to follow updates)';

-- ============================================================
-- RLS policies
-- ============================================================

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_watchers ENABLE ROW LEVEL SECURITY;

-- tags: workspace members can CRUD
CREATE POLICY "Workspace members can view tags"
  ON tags FOR SELECT
  USING (is_workspace_member(workspace_id, auth.uid()) OR is_workspace_owner(workspace_id, auth.uid()));

CREATE POLICY "Workspace members can create tags"
  ON tags FOR INSERT
  WITH CHECK (is_workspace_member(workspace_id, auth.uid()) OR is_workspace_owner(workspace_id, auth.uid()));

CREATE POLICY "Workspace members can update tags"
  ON tags FOR UPDATE
  USING (is_workspace_member(workspace_id, auth.uid()) OR is_workspace_owner(workspace_id, auth.uid()));

CREATE POLICY "Workspace members can delete tags"
  ON tags FOR DELETE
  USING (is_workspace_member(workspace_id, auth.uid()) OR is_workspace_owner(workspace_id, auth.uid()));

-- task_tags: workspace members can manage (via task's workspace)
CREATE POLICY "Workspace members can view task tags"
  ON task_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_tags.task_id
        AND (is_workspace_member(t.workspace_id, auth.uid()) OR is_workspace_owner(t.workspace_id, auth.uid()))
    )
  );

CREATE POLICY "Workspace members can add task tags"
  ON task_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_tags.task_id
        AND (is_workspace_member(t.workspace_id, auth.uid()) OR is_workspace_owner(t.workspace_id, auth.uid()))
    )
  );

CREATE POLICY "Workspace members can remove task tags"
  ON task_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_tags.task_id
        AND (is_workspace_member(t.workspace_id, auth.uid()) OR is_workspace_owner(t.workspace_id, auth.uid()))
    )
  );

-- task_watchers: workspace members can manage
CREATE POLICY "Workspace members can view task watchers"
  ON task_watchers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_watchers.task_id
        AND (is_workspace_member(t.workspace_id, auth.uid()) OR is_workspace_owner(t.workspace_id, auth.uid()))
    )
  );

CREATE POLICY "Users can watch tasks in their workspace"
  ON task_watchers FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_watchers.task_id
        AND (is_workspace_member(t.workspace_id, auth.uid()) OR is_workspace_owner(t.workspace_id, auth.uid()))
    )
  );

CREATE POLICY "Users can unwatch tasks"
  ON task_watchers FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- Updated_at trigger for tags
-- ============================================================
CREATE OR REPLACE FUNCTION update_tags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tags_updated_at
  BEFORE UPDATE ON tags
  FOR EACH ROW EXECUTE FUNCTION update_tags_updated_at();
