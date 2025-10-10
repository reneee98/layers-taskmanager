-- Fix RLS policies to prevent infinite recursion

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view workspaces they belong to" ON public.workspaces;
DROP POLICY IF EXISTS "Users can view workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can view invitations for their workspaces" ON public.workspace_invitations;

-- Create fixed policies
CREATE POLICY "Users can view workspaces they own" ON public.workspaces
    FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Users can view workspace members" ON public.workspace_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workspaces 
            WHERE id = workspace_id AND owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can view invitations for their workspaces" ON public.workspace_invitations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workspaces 
            WHERE id = workspace_id AND owner_id = auth.uid()
        )
    );
