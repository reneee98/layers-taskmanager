-- Add budget_cents column to tasks table
ALTER TABLE tasks ADD COLUMN budget_cents INTEGER;

-- Add comment
COMMENT ON COLUMN tasks.budget_cents IS 'Individual budget for the task in cents';

