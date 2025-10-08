-- Add budget_amount to tasks table
ALTER TABLE tasks 
ADD COLUMN budget_amount DECIMAL(10,2) DEFAULT 0;

COMMENT ON COLUMN tasks.budget_amount IS 'Budget amount in EUR for this task';

