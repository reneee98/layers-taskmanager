-- Migration for task comments and files functionality
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

-- Enable RLS (Row Level Security)
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_comments
-- Users can read comments for tasks they have access to
CREATE POLICY "Users can read comments for accessible tasks" ON public.task_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            JOIN public.projects p ON t.project_id = p.id
            JOIN public.project_members pm ON p.id = pm.project_id
            WHERE t.id = task_comments.task_id 
            AND pm.user_id = auth.uid()
        )
    );

-- Users can insert comments for tasks they have access to
CREATE POLICY "Users can insert comments for accessible tasks" ON public.task_comments
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.tasks t
            JOIN public.projects p ON t.project_id = p.id
            JOIN public.project_members pm ON p.id = pm.project_id
            WHERE t.id = task_comments.task_id 
            AND pm.user_id = auth.uid()
        )
    );

-- Users can update their own comments
CREATE POLICY "Users can update their own comments" ON public.task_comments
    FOR UPDATE USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can delete their own comments
CREATE POLICY "Users can delete their own comments" ON public.task_comments
    FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for task_files
-- Users can read files for tasks they have access to
CREATE POLICY "Users can read files for accessible tasks" ON public.task_files
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            JOIN public.projects p ON t.project_id = p.id
            JOIN public.project_members pm ON p.id = pm.project_id
            WHERE t.id = task_files.task_id 
            AND pm.user_id = auth.uid()
        )
    );

-- Users can insert files for tasks they have access to
CREATE POLICY "Users can insert files for accessible tasks" ON public.task_files
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.tasks t
            JOIN public.projects p ON t.project_id = p.id
            JOIN public.project_members pm ON p.id = pm.project_id
            WHERE t.id = task_files.task_id 
            AND pm.user_id = auth.uid()
        )
    );

-- Users can delete their own files
CREATE POLICY "Users can delete their own files" ON public.task_files
    FOR DELETE USING (user_id = auth.uid());

-- Create storage bucket for task files (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-files', 'task-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for task files
CREATE POLICY "Users can view task files" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'task-files' AND
        EXISTS (
            SELECT 1 FROM public.task_files tf
            JOIN public.tasks t ON tf.task_id = t.id
            JOIN public.projects p ON t.project_id = p.id
            JOIN public.project_members pm ON p.id = pm.project_id
            WHERE tf.file_path = storage.objects.name
            AND pm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can upload task files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'task-files' AND
        auth.uid() IS NOT NULL
    );

CREATE POLICY "Users can update task files" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'task-files' AND
        EXISTS (
            SELECT 1 FROM public.task_files tf
            WHERE tf.file_path = storage.objects.name
            AND tf.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete task files" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'task-files' AND
        EXISTS (
            SELECT 1 FROM public.task_files tf
            WHERE tf.file_path = storage.objects.name
            AND tf.user_id = auth.uid()
        )
    );
