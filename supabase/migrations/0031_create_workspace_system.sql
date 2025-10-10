-- Create workspaces table (one per user)
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create workspace_members table for invited users
CREATE TABLE IF NOT EXISTS public.workspace_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT DEFAULT 'member' NOT NULL CHECK (role IN ('member')),
    invited_by UUID REFERENCES auth.users(id),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);

-- Create workspace_invitations table
CREATE TABLE IF NOT EXISTS public.workspace_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    email TEXT NOT NULL,
    role TEXT DEFAULT 'member' NOT NULL CHECK (role IN ('member')),
    invited_by UUID REFERENCES auth.users(id) NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(workspace_id, email)
);

-- Add workspace_id to existing tables
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON public.workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON public.workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_workspace_id ON public.workspace_invitations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_email ON public.workspace_invitations(email);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_token ON public.workspace_invitations(token);
CREATE INDEX IF NOT EXISTS idx_projects_workspace_id ON public.projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON public.tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_clients_workspace_id ON public.clients(workspace_id);

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_workspaces_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_workspaces_updated_at ON public.workspaces;
CREATE TRIGGER trigger_update_workspaces_updated_at
    BEFORE UPDATE ON public.workspaces
    FOR EACH ROW
    EXECUTE FUNCTION update_workspaces_updated_at();

-- Function to create default workspace for new user
CREATE OR REPLACE FUNCTION create_default_workspace()
RETURNS TRIGGER AS $$
DECLARE
    workspace_id UUID;
BEGIN
    -- Create default workspace for new user
    INSERT INTO public.workspaces (name, description, owner_id)
    VALUES (
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)) || '''s Workspace',
        'Môj workspace',
        NEW.id
    )
    RETURNING id INTO workspace_id;
    
    -- Owner is automatically part of their workspace (no need for workspace_members entry)
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created_workspace ON auth.users;
CREATE TRIGGER on_auth_user_created_workspace
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_workspace();

-- Function to check if user has access to workspace
CREATE OR REPLACE FUNCTION user_has_workspace_access(p_user_id UUID, p_workspace_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- User has access if they own the workspace OR are a member
    RETURN EXISTS (
        SELECT 1 FROM public.workspaces 
        WHERE id = p_workspace_id AND owner_id = p_user_id
    ) OR EXISTS (
        SELECT 1 FROM public.workspace_members 
        WHERE user_id = p_user_id AND workspace_id = p_workspace_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's workspace (they only have one)
CREATE OR REPLACE FUNCTION get_user_workspace(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    role TEXT,
    owner_id UUID,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w.id,
        w.name,
        w.description,
        CASE 
            WHEN w.owner_id = p_user_id THEN 'owner'::TEXT
            ELSE 'member'::TEXT
        END as role,
        w.owner_id,
        w.created_at
    FROM public.workspaces w
    WHERE w.owner_id = p_user_id
    OR EXISTS (
        SELECT 1 FROM public.workspace_members wm 
        WHERE wm.workspace_id = w.id AND wm.user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workspaces
CREATE POLICY "Users can view workspaces they own" ON public.workspaces
    FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Users can update workspaces they own" ON public.workspaces
    FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can create workspaces" ON public.workspaces
    FOR INSERT WITH CHECK (owner_id = auth.uid());

-- RLS Policies for workspace_members
CREATE POLICY "Users can view workspace members" ON public.workspace_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workspaces 
            WHERE id = workspace_id AND owner_id = auth.uid()
        )
    );

CREATE POLICY "Workspace owners can manage members" ON public.workspace_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.workspaces 
            WHERE id = workspace_id AND owner_id = auth.uid()
        )
    );

-- RLS Policies for workspace_invitations
CREATE POLICY "Users can view invitations for their workspaces" ON public.workspace_invitations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workspaces 
            WHERE id = workspace_id AND owner_id = auth.uid()
        )
    );

CREATE POLICY "Workspace owners can manage invitations" ON public.workspace_invitations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.workspaces 
            WHERE id = workspace_id AND owner_id = auth.uid()
        )
    );

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.workspaces TO anon, authenticated;
GRANT ALL ON public.workspace_members TO anon, authenticated;
GRANT ALL ON public.workspace_invitations TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_default_workspace() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION user_has_workspace_access(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_workspace(UUID) TO anon, authenticated;
