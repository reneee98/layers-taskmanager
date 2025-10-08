export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  content_html?: string;
  created_at: string;
  updated_at: string;
  parent_id?: string;
  is_edited: boolean;
  // Joined data
  user?: {
    id: string;
    name: string;
    email: string;
  };
  replies?: TaskComment[];
}

export interface CreateTaskComment {
  task_id: string;
  content: string;
  content_html?: string;
  parent_id?: string;
}

export interface UpdateTaskComment {
  content: string;
  content_html?: string;
}
