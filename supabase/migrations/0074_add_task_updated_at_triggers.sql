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

