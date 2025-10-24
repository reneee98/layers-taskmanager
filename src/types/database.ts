export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  role: "owner" | "designer";
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
}

export interface Project {
  id: string;
  client_id: string;
  name: string;
  code?: string;
  description: string | null;
  status: "draft" | "active" | "on_hold" | "sent_to_client" | "completed" | "cancelled";
  currency?: string;
  start_date: string | null;
  end_date: string | null;
  hourly_rate: number | null;
  fixed_fee: number | null;
  external_costs_budget: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  client?: Client;
}

export interface Task {
  id: string;
  project_id: string;
  parent_task_id: string | null;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "review" | "sent_to_client" | "done" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  assignee_id: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  budget_amount: number | null;
  start_date: string | null;
  end_date: string | null;
  due_date: string | null;
  completed_at: string | null;
  order_index?: number;
  google_drive_link?: string | null;
  // Billing fields
  billable: boolean;
  bill_status: "unbilled" | "billed" | "excluded";
  hourly_rate_cents: number;
  actual_minutes: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  assignee?: User;
  assignees?: TaskAssignee[];
  project?: Project;
  calculated_price?: number; // Calculated from time entries
}

export interface TaskAssignee {
  id: string;
  task_id: string;
  user_id: string;
  assigned_at: string;
  assigned_by: string | null;
  user?: User;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: "owner" | "manager" | "member";
  hourly_rate: number | null;
  joined_at: string;
  user?: User;
}

export interface BillingItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  billable: boolean;
  bill_status: "unbilled" | "billed" | "excluded";
  hourly_rate_cents: number;
  actual_minutes: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  project_name: string;
  project_id: string | null;
  client_name: string | null;
  client_id: string | null;
  billing_amount_cents: number;
  billing_amount_euros: number;
  time_formatted: string;
  hourly_rate_euros: number;
}

