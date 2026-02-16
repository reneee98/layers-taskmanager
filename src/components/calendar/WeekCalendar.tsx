"use client";

import { format, startOfWeek, addDays, isToday, eachDayOfInterval } from "date-fns";
import { sk } from "date-fns/locale";
import { cn, stripHtml } from "@/lib/utils";
import { normalizeTaskColor, taskColorToRgba } from "@/lib/task-colors";
import type { AssignedTask } from "./types";

interface WeekCalendarProps {
  date: Date;
  tasks: AssignedTask[];
  onTaskClick: (task: AssignedTask) => void;
}

const getTaskColor = (task: AssignedTask, isDarkMode: boolean) => {
  const explicitColor = normalizeTaskColor(task.color);
  if (explicitColor) {
    return {
      bg: isDarkMode ? taskColorToRgba(explicitColor, 0.22) : taskColorToRgba(explicitColor, 0.12),
      text: isDarkMode ? "#f1f5f9" : "#0f172a",
      border: explicitColor,
    };
  }

  const colorSchemes = isDarkMode ? [
    { bg: 'rgba(30, 64, 175, 0.15)', text: '#93c5fd', border: '#3B82F6' },
    { bg: 'rgba(6, 95, 70, 0.15)', text: '#6ee7b7', border: '#10B981' },
    { bg: 'rgba(146, 64, 14, 0.15)', text: '#fbbf24', border: '#F59E0B' },
    { bg: 'rgba(91, 33, 182, 0.15)', text: '#c4b5fd', border: '#8B5CF6' },
    { bg: 'rgba(159, 18, 57, 0.15)', text: '#f9a8d4', border: '#EC4899' },
    { bg: 'rgba(14, 116, 144, 0.15)', text: '#67e8f9', border: '#06B6D4' },
    { bg: 'rgba(55, 48, 163, 0.15)', text: '#a5b4fc', border: '#6366F1' },
    { bg: 'rgba(19, 78, 74, 0.15)', text: '#5eead4', border: '#14B8A6' },
    { bg: 'rgba(154, 52, 18, 0.15)', text: '#fb923c', border: '#F97316' },
    { bg: 'rgba(107, 33, 168, 0.15)', text: '#c084fc', border: '#A855F7' },
  ] : [
    { bg: '#dbeafe', text: '#1e40af', border: '#3B82F6' },
    { bg: '#d1fae5', text: '#065f46', border: '#10B981' },
    { bg: '#fef3c7', text: '#92400e', border: '#F59E0B' },
    { bg: '#e9d5ff', text: '#5b21b6', border: '#8B5CF6' },
    { bg: '#fce7f3', text: '#9f1239', border: '#EC4899' },
    { bg: '#cffafe', text: '#0e7490', border: '#06B6D4' },
    { bg: '#e0e7ff', text: '#3730a3', border: '#6366F1' },
    { bg: '#ccfbf1', text: '#134e4a', border: '#14B8A6' },
    { bg: '#fed7aa', text: '#9a3412', border: '#F97316' },
    { bg: '#f3e8ff', text: '#6b21a8', border: '#A855F7' },
  ];
  
  let hash = 0;
  for (let i = 0; i < task.id.length; i++) {
    hash = task.id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % colorSchemes.length;
  return colorSchemes[colorIndex];
};

const getTasksForDay = (tasks: AssignedTask[], day: Date): AssignedTask[] => {
  return tasks.filter(task => {
    if (!task.due_date) return false;
    
    const taskDate = new Date(task.due_date + 'T00:00:00');
    const startDate = task.start_date 
      ? new Date(task.start_date + 'T00:00:00')
      : taskDate;
    const endDate = task.end_date
      ? new Date(task.end_date + 'T00:00:00')
      : taskDate;
    
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);
    
    return (startDate <= dayEnd && endDate >= dayStart);
  });
};

export const WeekCalendar = ({ date, tasks, onTaskClick }: WeekCalendarProps) => {
  // Ensure date is normalized (start of day)
  const normalizedDate = new Date(date);
  normalizedDate.setHours(0, 0, 0, 0);
  
  // Start of week - Monday is day 1 in date-fns
  const weekStart = startOfWeek(normalizedDate, { 
    locale: sk,
    weekStartsOn: 1 // Monday
  });
  
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: addDays(weekStart, 6),
  });

  const isDarkMode = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header with day names */}
      <div className="grid grid-cols-7 border-b border-border flex-shrink-0">
        {weekDays.map((day, index) => {
          const dayTasks = getTasksForDay(tasks, day);
          const today = isToday(day);
          
          return (
            <div
              key={index}
              className={cn(
                "flex flex-col border-r border-border last:border-r-0",
                index >= 5 && "bg-muted/30"
              )}
            >
              {/* Day header */}
              <div className="px-3 py-3 border-b border-border flex-shrink-0">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right mb-1">
                  {format(day, 'EEE', { locale: sk })}
                </div>
                <div className="flex justify-end">
                  <div
                    className={cn(
                      "text-sm font-medium transition-colors w-7 h-7 flex items-center justify-center rounded-full",
                      today
                        ? "bg-black text-white dark:bg-primary dark:text-primary-foreground"
                        : "text-foreground"
                    )}
                  >
                    {format(day, 'd', { locale: sk })}
                  </div>
                </div>
              </div>
              
              {/* Tasks container */}
              <div className="flex-1 px-2 py-2 min-h-[120px] max-h-[800px] overflow-y-auto">
                {dayTasks.length === 0 ? (
                  <div className="text-xs text-muted-foreground/50 text-center py-4">
                    —
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {dayTasks.map((task) => {
                      const colorScheme = getTaskColor(task, isDarkMode);
                      return (
                        <div
                          key={task.id}
                          onClick={() => onTaskClick(task)}
                          className={cn(
                            "px-2 py-2 rounded-md text-xs font-medium cursor-pointer transition-all hover:opacity-85 hover:shadow-sm",
                            "flex flex-col gap-0.5"
                          )}
                          style={{
                            backgroundColor: colorScheme.bg,
                            color: colorScheme.text,
                            borderLeft: `3px solid ${colorScheme.border}`,
                          }}
                          title={`${stripHtml(task.title)}${task.project ? ` - ${task.project.name}` : ''}`}
                        >
                          <div className="truncate font-semibold">
                            {stripHtml(task.title)}
                          </div>
                          {task.project && (
                            <div className="text-[10px] opacity-75 truncate">
                              {task.project.code || task.project.name}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
