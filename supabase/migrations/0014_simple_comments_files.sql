-- Simple migration for task comments and files (without RLS for now)
-- This migration adds support for comments and file attachments to tasks

-- Create task_comments table
CREATE TABLE IF NOT EXISTS public.task_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    content_html TEXT, -- For rich text formatting
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    parent_id UUID REFERENCES public.task_comments(id) ON DELETE CASCADE, -- For replies
    is_edited BOOLEAN DEFAULT FALSE
);

-- Create task_files table
CREATE TABLE IF NOT EXISTS public.task_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    file_path TEXT NOT NULL, -- Path in storage bucket
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    description TEXT -- Optional description for the file
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user_id ON public.task_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_created_at ON public.task_comments(created_at);
CREATE INDEX IF NOT EXISTS idx_task_comments_parent_id ON public.task_comments(parent_id);

CREATE INDEX IF NOT EXISTS idx_task_files_task_id ON public.task_files(task_id);
CREATE INDEX IF NOT EXISTS idx_task_files_user_id ON public.task_files(user_id);
CREATE INDEX IF NOT EXISTS idx_task_files_created_at ON public.task_files(created_at);

-- Add updated_at trigger for task_comments
CREATE OR REPLACE FUNCTION update_task_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_task_comments_updated_at
    BEFORE UPDATE ON public.task_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_task_comments_updated_at();

-- Disable RLS for now (for testing)
ALTER TABLE public.task_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_files DISABLE ROW LEVEL SECURITY;

-- Create storage bucket for task files (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-files', 'task-files', false)
ON CONFLICT (id) DO NOTHING;

-- Simple storage policies (allow all for now)
CREATE POLICY "Allow all for task files" ON storage.objects
    FOR ALL USING (bucket_id = 'task-files')
    WITH CHECK (bucket_id = 'task-files');
