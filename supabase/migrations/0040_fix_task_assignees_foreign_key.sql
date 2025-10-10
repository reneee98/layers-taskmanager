-- Fix task_assignees foreign key constraint to reference auth.users instead of users table
-- This is needed because we're using profiles table which references auth.users

-- Drop the existing foreign key constraint
ALTER TABLE public.task_assignees 
DROP CONSTRAINT IF EXISTS task_assignees_user_id_fkey;

-- Add new foreign key constraint that references auth.users
ALTER TABLE public.task_assignees 
ADD CONSTRAINT task_assignees_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Also fix the assigned_by foreign key constraint
ALTER TABLE public.task_assignees 
DROP CONSTRAINT IF EXISTS task_assignees_assigned_by_fkey;

ALTER TABLE public.task_assignees 
ADD CONSTRAINT task_assignees_assigned_by_fkey 
FOREIGN KEY (assigned_by) REFERENCES auth.users(id) ON DELETE SET NULL;
