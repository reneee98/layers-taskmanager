export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  owner_id: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'user';
  joined_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: 'active' | 'on_hold' | 'completed' | 'cancelled';
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  created_at: string;
  updated_at: string;
  workspace_id: string;
  client_id: string | null;
  created_by: string | null;
}

export interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
  workspace_id: string;
  created_by: string | null;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: string | null;
  created_at: string;
  updated_at: string;
  project_id: string;
  assignee_id: string | null;
  created_by: string | null;
  google_drive_link?: string | null; // Old single link field
  google_drive_links?: GoogleDriveLink[]; // New multi-link field
}

export interface GoogleDriveLink {
  id: string;
  task_id: string;
  url: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface TaskChecklistItem {
  id: string;
  task_id: string;
  text: string;
  completed: boolean;
  position: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface TimeEntry {
  id: string;
  task_id: string;
  user_id: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  type: string;
  description: string;
  metadata: any;
  created_at: string;
  user_id: string;
  task_id: string | null;
  project_id: string | null;
}