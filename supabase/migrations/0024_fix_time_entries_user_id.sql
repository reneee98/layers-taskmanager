-- Update existing time_entries to use the first user's ID instead of all zeros
UPDATE public.time_entries
SET user_id = (SELECT id FROM public.users ORDER BY created_at LIMIT 1)
WHERE user_id = '00000000-0000-0000-0000-000000000000';
