-- Debug script to check checklist items for a specific task
-- Replace 'YOUR_TASK_ID' with the actual task ID

-- 1. Check all checklist items for the task (including deleted ones if any)
SELECT 
  id,
  task_id,
  text,
  completed,
  position,
  created_at,
  updated_at,
  created_by
FROM task_checklist_items
WHERE task_id = 'YOUR_TASK_ID'
ORDER BY position ASC, created_at DESC;

-- 2. Check if there are duplicate items
SELECT 
  text,
  COUNT(*) as count,
  array_agg(id) as item_ids
FROM task_checklist_items
WHERE task_id = 'YOUR_TASK_ID'
GROUP BY text
HAVING COUNT(*) > 1;

-- 3. Check the task's updated_at timestamp
SELECT 
  id,
  title,
  updated_at,
  share_token
FROM tasks
WHERE id = 'YOUR_TASK_ID';

-- 4. Check if triggers are working - update a checklist item and see if task.updated_at changes
-- Run this to test:
-- UPDATE task_checklist_items SET completed = NOT completed WHERE task_id = 'YOUR_TASK_ID' LIMIT 1;
-- Then check task.updated_at again

-- 5. Verify triggers exist
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('task_checklist_items', 'task_comments', 'google_drive_links', 'tasks')
ORDER BY event_object_table, trigger_name;

