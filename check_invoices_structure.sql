-- Check invoices table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'invoices' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if invoices table exists
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_name = 'invoices' AND table_schema = 'public';
