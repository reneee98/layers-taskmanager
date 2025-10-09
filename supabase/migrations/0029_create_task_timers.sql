-- Create task_timers table for individual task timers
CREATE TABLE IF NOT EXISTS public.task_timers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    stopped_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create partial unique index to ensure only one active timer per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_timers_active_user 
ON public.task_timers (user_id) 
WHERE stopped_at IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_task_timers_task_id ON public.task_timers(task_id);
CREATE INDEX IF NOT EXISTS idx_task_timers_user_id ON public.task_timers(user_id);
CREATE INDEX IF NOT EXISTS idx_task_timers_started_at ON public.task_timers(started_at);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_task_timers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists, then create it
DROP TRIGGER IF EXISTS trigger_update_task_timers_updated_at ON public.task_timers;
CREATE TRIGGER trigger_update_task_timers_updated_at
    BEFORE UPDATE ON public.task_timers
    FOR EACH ROW
    EXECUTE FUNCTION update_task_timers_updated_at();

-- Disable RLS for now (for testing)
ALTER TABLE public.task_timers DISABLE ROW LEVEL SECURITY;

-- Create functions for timer management
CREATE OR REPLACE FUNCTION start_timer(p_task_id UUID, p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    timer_id UUID;
BEGIN
    -- Stop any active timer for this user first
    UPDATE public.task_timers 
    SET stopped_at = NOW() 
    WHERE user_id = p_user_id AND stopped_at IS NULL;
    
    -- Start new timer
    INSERT INTO public.task_timers (task_id, user_id, started_at)
    VALUES (p_task_id, p_user_id, NOW())
    RETURNING id INTO timer_id;
    
    RETURN timer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION stop_timer(p_timer_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    affected_rows INTEGER;
BEGIN
    -- Stop the timer if it belongs to the user and is still active
    UPDATE public.task_timers 
    SET stopped_at = NOW() 
    WHERE id = p_timer_id AND user_id = p_user_id AND stopped_at IS NULL;
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    RETURN affected_rows > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
