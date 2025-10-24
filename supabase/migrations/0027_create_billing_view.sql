-- Create billing view for completed billable tasks
-- This view provides a comprehensive view of all billable tasks for invoicing

-- Create billing view
CREATE OR REPLACE VIEW billing_items AS
SELECT 
  t.id,
  t.title,
  t.description,
  t.status,
  t.billable,
  t.bill_status,
  t.hourly_rate_cents,
  t.actual_minutes,
  t.completed_at,
  t.created_at,
  t.updated_at,
  -- Project information (or "No Project" for tasks without project)
  COALESCE(p.name, 'No Project') as project_name,
  p.id as project_id,
  -- Client information
  c.name as client_name,
  c.id as client_id,
  -- Calculate billing amount
  CASE 
    WHEN t.hourly_rate_cents > 0 AND t.actual_minutes > 0 THEN
      ROUND((t.hourly_rate_cents * t.actual_minutes) / 60.0) / 100.0
    ELSE 0
  END as billing_amount_cents,
  -- Calculate billing amount in euros
  CASE 
    WHEN t.hourly_rate_cents > 0 AND t.actual_minutes > 0 THEN
      ROUND((t.hourly_rate_cents * t.actual_minutes) / 60.0) / 100.0
    ELSE 0
  END as billing_amount_euros,
  -- Time formatting
  CASE 
    WHEN t.actual_minutes > 0 THEN
      CONCAT(
        FLOOR(t.actual_minutes / 60), 'h ',
        MOD(t.actual_minutes, 60), 'm'
      )
    ELSE '0h 0m'
  END as time_formatted,
  -- Hourly rate in euros
  ROUND(t.hourly_rate_cents / 100.0, 2) as hourly_rate_euros
FROM tasks t
LEFT JOIN projects p ON t.project_id = p.id
LEFT JOIN clients c ON p.client_id = c.id
WHERE t.status = 'done' 
  AND t.billable = true
  AND t.bill_status != 'excluded';

-- Add comment to explain the view
COMMENT ON VIEW billing_items IS 'View of all completed billable tasks for invoicing, including No Project tasks';

-- Grant permissions to authenticated users
GRANT SELECT ON billing_items TO authenticated;
