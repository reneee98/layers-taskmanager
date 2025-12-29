-- Check profiles table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- Check what data exists in profiles
SELECT id, email, display_name, full_name, created_at
FROM profiles 
LIMIT 5;
