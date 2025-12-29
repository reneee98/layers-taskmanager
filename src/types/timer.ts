export interface TaskTimer {
  id: string;
  task_id: string;
  user_id: string;
  started_at: string;
  stopped_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActiveTimer {
  id: string;
  task_id: string;
  task_name: string;
  project_name: string;
  project_id: string;
  started_at: string;
  duration: number; // in seconds
}

export interface TimerContextType {
  activeTimer: ActiveTimer | null;
  currentDuration: number;
  startTimer: (taskId: string, taskName: string, projectId: string, projectName: string) => Promise<void>;
  stopTimer: () => Promise<void>;
  refreshTimer: () => Promise<void>;
}
