-- ============================================================
-- Migration: In-app notifications (for task watchers & assignees)
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,  -- recipient
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,          -- who triggered it
  type         TEXT NOT NULL,          -- 'status_change' | 'comment' | 'due_date' | ...
  title        TEXT NOT NULL,          -- human message, e.g. 'René zmenil status úlohy na "Hotovo"'
  body         TEXT,                   -- context, e.g. task title
  task_id      UUID REFERENCES tasks(id) ON DELETE CASCADE,
  project_id   UUID REFERENCES projects(id) ON DELETE CASCADE,
  read_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications(user_id, created_at DESC);

COMMENT ON TABLE notifications IS 'In-app notifications; recipients are task watchers/assignees';

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Recipients can read their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Recipients can mark their own notifications as read
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Recipients can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Any workspace member/owner can create notifications for others,
-- but only as themselves (actor) and only within their workspace
CREATE POLICY "Members can create notifications as actor"
  ON notifications FOR INSERT
  WITH CHECK (
    actor_id = auth.uid() AND
    (is_workspace_member(workspace_id, auth.uid()) OR is_workspace_owner(workspace_id, auth.uid()))
  );
