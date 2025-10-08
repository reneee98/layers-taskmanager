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
  status: "draft" | "active" | "on_hold" | "completed" | "cancelled";
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
  status: "todo" | "in_progress" | "review" | "done" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  assigned_to: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  budget_amount: number | null;
  due_date: string | null;
  completed_at: string | null;
  order_index?: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  project?: Project;
}

