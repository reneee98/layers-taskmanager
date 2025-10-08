-- Remove budget_amount from projects table
-- Budget is now calculated from tasks.budget_amount

-- 1. First add budget_amount to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS budget_amount DECIMAL(10,2) DEFAULT 0;

COMMENT ON COLUMN tasks.budget_amount IS 'Budget amount in EUR for this task';

-- 2. Update the project_finance_view to use tasks budget
DROP VIEW IF EXISTS project_finance_view;

CREATE VIEW project_finance_view AS
SELECT 
  p.id,
  p.name,
  p.code,
  p.status,
  p.client_id,
  
  -- Billable hours and labor cost
  COALESCE(SUM(te.hours) FILTER (WHERE te.is_billable = TRUE), 0) AS billable_hours,
  COALESCE(SUM(te.amount) FILTER (WHERE te.is_billable = TRUE), 0) AS labor_cost,
  
  -- External costs
  COALESCE(SUM(ci.amount) FILTER (WHERE ci.is_billable = TRUE), 0) AS external_cost,
  
  -- Fee amount (fixed fee)
  COALESCE(p.fixed_fee, 0) AS fee_amount,
  
  -- Total price (labor + external + fee)
  COALESCE(SUM(te.amount) FILTER (WHERE te.is_billable = TRUE), 0) + 
  COALESCE(SUM(ci.amount) FILTER (WHERE ci.is_billable = TRUE), 0) + 
  COALESCE(p.fixed_fee, 0) AS total_price,
  
  -- Budget from tasks
  COALESCE(SUM(t.budget_amount), 0) AS budget_amount,
  
  -- Margin (total price - budget from tasks)
  (COALESCE(SUM(te.amount) FILTER (WHERE te.is_billable = TRUE), 0) + 
   COALESCE(SUM(ci.amount) FILTER (WHERE ci.is_billable = TRUE), 0) + 
   COALESCE(p.fixed_fee, 0)) - 
  COALESCE(SUM(t.budget_amount), 0) AS margin,
  
  -- Margin percentage
  CASE 
    WHEN COALESCE(SUM(t.budget_amount), 0) > 0 THEN
      (((COALESCE(SUM(te.amount) FILTER (WHERE te.is_billable = TRUE), 0) + 
         COALESCE(SUM(ci.amount) FILTER (WHERE ci.is_billable = TRUE), 0) + 
         COALESCE(p.fixed_fee, 0)) - 
        COALESCE(SUM(t.budget_amount), 0)) / SUM(t.budget_amount)) * 100
    ELSE 0
  END AS margin_pct,
  
  -- Additional useful metrics
  COALESCE(SUM(te.hours), 0) AS total_hours,
  
  -- Invoicing status
  COALESCE(SUM(te.amount) FILTER (WHERE te.invoiced = TRUE), 0) AS invoiced_labor,
  COALESCE(SUM(ci.amount) FILTER (WHERE ci.invoiced = TRUE), 0) AS invoiced_costs,
  
  p.created_at,
  p.updated_at

FROM projects p
LEFT JOIN tasks t ON t.project_id = p.id
LEFT JOIN time_entries te ON te.task_id = t.id
LEFT JOIN cost_items ci ON ci.project_id = p.id
GROUP BY p.id, p.name, p.code, p.status, p.client_id, p.fixed_fee, p.created_at, p.updated_at;

-- 3. Now remove budget_amount, fee_markup_pct and budget_hours from projects table
ALTER TABLE projects 
DROP COLUMN IF EXISTS budget_amount,
DROP COLUMN IF EXISTS fee_markup_pct,
DROP COLUMN IF EXISTS budget_hours;

COMMENT ON TABLE projects IS 'Projects no longer have budget_amount, fee_markup_pct or budget_hours - budget is calculated from tasks';
