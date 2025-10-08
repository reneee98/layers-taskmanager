-- Add foreign key constraint from time_entries to users table
ALTER TABLE public.time_entries
ADD CONSTRAINT time_entries_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.users(id) 
ON DELETE CASCADE;
