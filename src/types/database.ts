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
  code: string | null;
  status: 'active' | 'on_hold' | 'completed' | 'cancelled';
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  hourly_rate_cents: number | null;
  created_at: string;
  updated_at: string;
  workspace_id: string;
  client_id: string | null;
  created_by: string | null;
  client?: {
    id: string;
    name: string;
    email: string | null;
  } | null;
}

export interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  tax_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  workspace_id: string;
  created_by: string | null;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'review' | 'sent_to_client' | 'done' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: string | null;
  created_at: string;
  updated_at: string;
  project_id: string;
  assignee_id: string | null;
  created_by: string | null;
  google_drive_link?: string | null; // Old single link field
  google_drive_links?: GoogleDriveLink[]; // New multi-link field
  // Billing and time tracking fields
  estimated_hours?: number | null;
  actual_hours?: number | null;
  hourly_rate_cents?: number | null;
  budget_cents?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  calculated_price?: number | null;
  // Related data
  project?: {
    id: string;
    name: string;
    code: string;
    hourly_rate?: number | null;
    budget?: number | null;
  };
  assignees?: Array<{
    id: string;
    task_id: string;
    user_id: string;
    assigned_at: string;
    assigned_by: string | null;
    display_name?: string;
    email?: string;
    role?: string;
  }>;
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

export interface TaskAssignee {
  id: string;
  task_id: string;
  user_id: string;
  assigned_at: string;
  assigned_by: string | null;
  workspace_id: string;
  user: {
    id: string;
    email: string;
    display_name: string;
    avatar_url: string | null;
    role: string;
    created_at: string;
    updated_at: string;
    name: string;
  };
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