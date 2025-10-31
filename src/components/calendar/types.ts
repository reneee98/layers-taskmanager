export interface AssignedTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  estimated_hours: number | null;
  actual_hours: number | null;
  due_date: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  project_id: string;
  assignee_id: string | null;
  budget_cents: number | null;
  days_until_deadline: number | null;
  assignees?: {
    id: string;
    user_id: string;
    user?: {
      id: string;
      name: string;
      email: string;
    };
  }[];
  project: {
    id: string;
    name: string;
    code: string;
    client?: {
      id: string;
      name: string;
    };
  };
}

