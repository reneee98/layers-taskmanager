import { PROJECT_COLOR_PALETTE } from "@/lib/project-colors";

export const TASK_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

// Tasks and projects intentionally share one muted dashboard palette.
export const TASK_COLOR_PALETTE = PROJECT_COLOR_PALETTE;

const hashTaskId = (taskId: string) => {
  let hash = 0;

  for (let index = 0; index < taskId.length; index += 1) {
    hash = (hash * 31 + taskId.charCodeAt(index)) | 0;
  }

  return Math.abs(hash);
};

export function normalizeTaskColor(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toUpperCase();
  return TASK_COLOR_REGEX.test(normalized) ? normalized : null;
}

export const getRandomTaskColor = () =>
  TASK_COLOR_PALETTE[Math.floor(Math.random() * TASK_COLOR_PALETTE.length)];

export const getTaskFallbackColor = (taskId: string) =>
  TASK_COLOR_PALETTE[hashTaskId(taskId) % TASK_COLOR_PALETTE.length];

export const resolveTaskColor = (
  task: { id: string; color?: string | null } | null | undefined
) => {
  if (!task) return null;
  return normalizeTaskColor(task.color) || getTaskFallbackColor(task.id);
};

export function taskColorToRgba(color: string, alpha: number): string {
  const normalized = normalizeTaskColor(color);
  if (!normalized) {
    return `rgba(148, 163, 184, ${alpha})`;
  }

  const r = Number.parseInt(normalized.slice(1, 3), 16);
  const g = Number.parseInt(normalized.slice(3, 5), 16);
  const b = Number.parseInt(normalized.slice(5, 7), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
