export interface Comment {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  user: {
    name: string;
    email: string;
  };
}

export interface CreateCommentData {
  content: string;
}
