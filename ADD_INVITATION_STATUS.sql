-- Add status column to workspace_invitations table
ALTER TABLE public.workspace_invitations 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'expired'));

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_status ON public.workspace_invitations(status);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_email ON public.workspace_invitations(email);
