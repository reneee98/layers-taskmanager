export type UserRole = 'member' | 'admin' | 'owner' | 'designer';

export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  language: string;
  theme: 'light' | 'dark' | 'system';
  notifications: {
    email: boolean;
    push: boolean;
    task_updates: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface RegisterData {
  email: string;
  password: string;
  display_name: string;
}

export interface UpdateProfileData {
  display_name?: string;
  avatar_url?: string;
}

export interface UpdateUserRoleData {
  role: UserRole;
}

export interface UpdateSettingsData {
  language?: string;
  theme?: 'light' | 'dark' | 'system';
  notifications?: {
    email?: boolean;
    push?: boolean;
    task_updates?: boolean;
  };
}
