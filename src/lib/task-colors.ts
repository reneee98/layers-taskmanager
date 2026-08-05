import { PROJECT_COLOR_PALETTE } from "@/lib/project-colors";

export const TASK_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

// Tasks and projects intentionally share one muted dashboard palette.
export const TASK_COLOR_PALETTE = PROJECT_COLOR_PALETTE;

export function normalizeTaskColor(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toUpperCase();
  return TASK_COLOR_REGEX.test(normalized) ? normalized : null;
}

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
