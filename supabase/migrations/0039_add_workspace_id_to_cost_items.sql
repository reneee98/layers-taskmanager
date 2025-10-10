-- Add workspace_id to cost_items table
-- This is critical for workspace isolation

-- Add workspace_id column to cost_items
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

-- Update existing task_assignees to have workspace_id based on their task
UPDATE public.task_assignees 
SET workspace_id = t.workspace_id
FROM public.tasks t
WHERE task_assignees.task_id = t.id 
AND task_assignees.workspace_id IS NULL;

-- Make workspace_id NOT NULL for task_assignees after updating existing data
ALTER TABLE public.task_assignees 
ALTER COLUMN workspace_id SET NOT NULL;
