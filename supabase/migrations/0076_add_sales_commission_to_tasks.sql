-- Migration: Add sales commission columns to tasks table
-- Purpose: Allow storing sales commission settings for tasks

-- Add sales_commission_enabled column
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS sales_commission_enabled BOOLEAN DEFAULT FALSE;

-- Add sales_commission_user_id column
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS sales_commission_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Add sales_commission_percent column
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS sales_commission_percent NUMERIC(5, 2);

-- Add comments for documentation
COMMENT ON COLUMN tasks.sales_commission_enabled IS 'Whether sales commission is enabled for this task';
COMMENT ON COLUMN tasks.sales_commission_user_id IS 'ID of the sales person who should receive commission';
COMMENT ON COLUMN tasks.sales_commission_percent IS 'Percentage of budget to be paid as commission (0-100)';

-- Verify the columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tasks' 
  AND column_name IN ('sales_commission_enabled', 'sales_commission_user_id', 'sales_commission_percent');

