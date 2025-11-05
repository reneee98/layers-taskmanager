import { isToday, isAfter, isBefore, startOfDay, endOfDay, addDays } from "date-fns";

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
  project_id: string | null;
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
  } | null;
}

export type DashboardTabType = "today" | "sent_to_client" | "in_progress" | "all_active" | "unassigned" | "no_project";

export const filterTasksByTab = (tasks: AssignedTask[], tabType: DashboardTabType): AssignedTask[] => {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekEnd = addDays(todayStart, 7);

  switch (tabType) {
    case "today":
      return tasks.filter(task => {
        // Nezobrazovať úlohy so statusom "sent_to_client"
        if (task.status === "sent_to_client") {
          return false;
        }
        // Úloha je "dnes" ak má deadline dnes ALEBO ak má štart dnes
        // Normalize dates to start of day for accurate comparison
        const hasDueDateToday = task.due_date && isToday(startOfDay(new Date(task.due_date)));
        const hasStartDateToday = task.start_date && isToday(startOfDay(new Date(task.start_date)));
        return hasDueDateToday || hasStartDateToday;
      });

    case "sent_to_client":
      return tasks.filter(task => task.status === "sent_to_client");

    case "in_progress":
      return tasks.filter(task => task.status === "in_progress");

    case "all_active":
      return tasks.filter(task => 
        task.status !== "done" && task.status !== "cancelled"
      );

    case "unassigned":
      // Nepriradené tasky - bez assigneeov
      return tasks.filter(task => 
        (!task.assignees || task.assignees.length === 0) &&
        task.status !== "done" && 
        task.status !== "cancelled"
      );

    case "no_project":
      // Úlohy bez projektu
      return tasks.filter(task => 
        !task.project_id &&
        task.status !== "done" && 
        task.status !== "cancelled"
      );

    default:
      return tasks;
  }
};

export const getTaskCountsByTab = (tasks: AssignedTask[]): Record<DashboardTabType, number> => {
  return {
    today: filterTasksByTab(tasks, "today").length,
    sent_to_client: filterTasksByTab(tasks, "sent_to_client").length,
    in_progress: filterTasksByTab(tasks, "in_progress").length,
    all_active: filterTasksByTab(tasks, "all_active").length,
    unassigned: filterTasksByTab(tasks, "unassigned").length,
    no_project: filterTasksByTab(tasks, "no_project").length,
  };
};
