-- Add billing fields to tasks table
-- This migration adds billing-related fields for invoicing functionality

-- Add billing fields to tasks table
ALTER TABLE tasks 
ADD COLUMN billable BOOLEAN DEFAULT false,
ADD COLUMN bill_status VARCHAR(20) DEFAULT 'unbilled',
ADD COLUMN hourly_rate_cents INTEGER DEFAULT 0,
ADD COLUMN actual_minutes INTEGER DEFAULT 0;

-- Add comments to explain the columns
COMMENT ON COLUMN tasks.billable IS 'Whether this task is billable to the client';
COMMENT ON COLUMN tasks.bill_status IS 'Billing status: unbilled, billed, excluded';
COMMENT ON COLUMN tasks.hourly_rate_cents IS 'Hourly rate in cents (e.g., 5000 = €50.00)';
COMMENT ON COLUMN tasks.actual_minutes IS 'Actual time spent in minutes';

-- Create indexes for better performance on billing queries
CREATE INDEX IF NOT EXISTS idx_tasks_billable ON tasks(billable);
CREATE INDEX IF NOT EXISTS idx_tasks_bill_status ON tasks(bill_status);
CREATE INDEX IF NOT EXISTS idx_tasks_billing_combo ON tasks(status, billable, bill_status) WHERE status = 'done';

-- Add check constraint for bill_status
ALTER TABLE tasks 
ADD CONSTRAINT check_bill_status 
CHECK (bill_status IN ('unbilled', 'billed', 'excluded'));

-- Add check constraint for hourly_rate_cents (must be >= 0)
ALTER TABLE tasks 
ADD CONSTRAINT check_hourly_rate_cents 
CHECK (hourly_rate_cents >= 0);

-- Add check constraint for actual_minutes (must be >= 0)
ALTER TABLE tasks 
ADD CONSTRAINT check_actual_minutes 
CHECK (actual_minutes >= 0);
