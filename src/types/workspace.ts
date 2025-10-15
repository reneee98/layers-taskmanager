export interface Workspace {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  role: 'owner' | 'member';
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: 'owner' | 'member';
  invited_by?: string;
  joined_at: string;
  created_at: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export interface WorkspaceInvitation {
  id: string;
  workspace_id: string;
  email: string;
  role: 'owner' | 'member';
  invited_by: string;
  token: string;
  expires_at: string;
  accepted_at?: string;
  created_at: string;
  workspace?: {
    id: string;
    name: string;
  };
  inviter?: {
    id: string;
    name: string;
  };
}

export interface CreateWorkspaceData {
  name: string;
  description?: string;
}

export interface InviteUserData {
  email: string;
  role: 'owner' | 'member';
}

export interface UpdateWorkspaceData {
  name?: string;
  description?: string;
}

export interface UpdateMemberRoleData {
  role: 'owner' | 'member';
}
