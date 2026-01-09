export interface TaskTimer {
  id: string;
  task_id: string;
  user_id: string;
  started_at: string;
  stopped_at: string | null;
  is_extra: boolean;
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
  is_extra?: boolean; // indicates if timer is tracking extra (non-billable) time
}

export interface TimerContextType {
  activeTimer: ActiveTimer | null;
  currentDuration: number;
  startTimer: (taskId: string, taskName: string, projectId: string, projectName: string, isExtra?: boolean) => Promise<void>;
  stopTimer: () => Promise<void>;
  refreshTimer: () => Promise<void>;
}
