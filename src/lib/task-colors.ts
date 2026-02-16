export const TASK_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

export const TASK_COLOR_PALETTE = [
  "#2563EB", // blue
  "#0EA5E9", // sky
  "#14B8A6", // teal
  "#22C55E", // green
  "#84CC16", // lime
  "#F59E0B", // amber
  "#F97316", // orange
  "#EF4444", // red
  "#EC4899", // pink
  "#A855F7", // violet
] as const;

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
