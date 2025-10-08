export interface TaskFile {
  id: string;
  task_id: string;
  user_id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  file_path: string;
  created_at: string;
  description?: string;
  // Joined data
  user?: {
    id: string;
    name: string;
    email: string;
  };
  // Computed
  file_url?: string;
  file_extension?: string;
  formatted_size?: string;
}

export interface CreateTaskFile {
  task_id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  file_path: string;
  description?: string;
}

export interface UploadTaskFile {
  task_id: string;
  file: File;
  description?: string;
}
