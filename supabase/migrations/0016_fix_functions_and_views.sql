-- Fix missing functions and views

-- 1. Create the missing update_task_actual_hours function
CREATE OR REPLACE FUNCTION public.update_task_actual_hours(task_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE tasks 
  SET actual_hours = (
    SELECT COALESCE(SUM(hours), 0)
    FROM time_entries 
    WHERE time_entries.task_id = tasks.id
  )
  WHERE tasks.id = task_id;
END;
$$ LANGUAGE plpgsql;

-- 2. Fix the project_finance_view to include project_id
DROP VIEW IF EXISTS project_finance_view;

CREATE VIEW project_finance_view AS
SELECT 
  p.id as project_id,
  p.name as project_name,
  COALESCE(SUM(te.hours), 0) as billable_hours,
  COALESCE(SUM(te.amount), 0) as labor_cost,
  COALESCE(SUM(ci.amount), 0) as external_cost,
  COALESCE(SUM(te.amount), 0) as fee_amount, -- Same as labor_cost for now
  COALESCE(SUM(te.amount), 0) + COALESCE(SUM(ci.amount), 0) as total_price,
  COALESCE(SUM(te.amount), 0) + COALESCE(SUM(ci.amount), 0) as margin,
  CASE 
    WHEN COALESCE(SUM(te.amount), 0) + COALESCE(SUM(ci.amount), 0) > 0 
    THEN ((COALESCE(SUM(te.amount), 0) + COALESCE(SUM(ci.amount), 0)) / (COALESCE(SUM(te.amount), 0) + COALESCE(SUM(ci.amount), 0))) * 100
    ELSE 0 
  END as margin_pct
FROM projects p
LEFT JOIN tasks t ON t.project_id = p.id
LEFT JOIN time_entries te ON te.task_id = t.id
LEFT JOIN cost_items ci ON ci.task_id = t.id
GROUP BY p.id, p.name;

-- 3. Create a function to update all task actual_hours for a project
CREATE OR REPLACE FUNCTION public.update_project_task_hours(project_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE tasks 
  SET actual_hours = (
    SELECT COALESCE(SUM(hours), 0)
    FROM time_entries 
    WHERE time_entries.task_id = tasks.id
  )
  WHERE tasks.project_id = project_id;
END;
$$ LANGUAGE plpgsql;

-- 4. Create a trigger to automatically update actual_hours when time_entries change
CREATE OR REPLACE FUNCTION public.trigger_update_task_hours()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the task's actual_hours
  UPDATE tasks 
  SET actual_hours = (
    SELECT COALESCE(SUM(hours), 0)
    FROM time_entries 
    WHERE time_entries.task_id = COALESCE(NEW.task_id, OLD.task_id)
  )
  WHERE tasks.id = COALESCE(NEW.task_id, OLD.task_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for time_entries changes
DROP TRIGGER IF EXISTS update_task_hours_trigger ON time_entries;
CREATE TRIGGER update_task_hours_trigger
  AFTER INSERT OR UPDATE OR DELETE ON time_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_task_hours();
