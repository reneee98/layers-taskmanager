export interface ProjectMemberOption {
  user_id: string;
  display_name: string;
  email: string;
  is_assigned: boolean;
  has_full_access: boolean;
  is_privileged: boolean;
}

export interface ProjectMembersResponse {
  success: boolean;
  data?: ProjectMemberOption[];
  can_manage_members?: boolean;
  can_edit_project?: boolean;
  error?: string;
}
