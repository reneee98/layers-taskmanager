-- CRITICAL WORKSPACE SECURITY FIX
-- This fixes critical security issues where users could see data from other workspaces

-- 1. Add workspace_id to cost_items table (MISSING!)
ALTER TABLE public.cost_items 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_cost_items_workspace_id ON public.cost_items(workspace_id);

-- Update existing cost_items to have workspace_id based on their project
UPDATE public.cost_items 
SET workspace_id = p.workspace_id
FROM public.projects p
WHERE cost_items.project_id = p.id 
AND cost_items.workspace_id IS NULL;

-- Make workspace_id NOT NULL after updating existing data
ALTER TABLE public.cost_items 
ALTER COLUMN workspace_id SET NOT NULL;

-- 2. Update existing task_assignees to have workspace_id based on their task
UPDATE public.task_assignees 
SET workspace_id = t.workspace_id
FROM public.tasks t
WHERE task_assignees.task_id = t.id 
AND task_assignees.workspace_id IS NULL;

-- Make workspace_id NOT NULL for task_assignees after updating existing data
ALTER TABLE public.task_assignees 
ALTER COLUMN workspace_id SET NOT NULL;

-- 3. Fix profiles table RLS policies to allow INSERT operations
CREATE POLICY "Users can create own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can create own settings" ON public.user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);
