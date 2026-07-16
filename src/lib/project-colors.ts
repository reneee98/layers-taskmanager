export const PROJECT_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

export const PROJECT_COLOR_PALETTE = [
  "#6F83A8", // muted blue
  "#6F91A3", // muted sky
  "#698C92", // muted cyan
  "#688B82", // muted teal
  "#738D73", // sage
  "#879270", // muted olive
  "#A08B68", // sand
  "#A47D69", // muted terracotta
  "#A36F70", // muted rose
  "#9C7387", // dusty pink
  "#87779D", // muted violet
  "#73799D", // muted indigo
] as const;

export const normalizeProjectColor = (value: string | null | undefined): string | null => {
  if (!value) return null;

  const normalized = value.trim().toUpperCase();
  return PROJECT_COLOR_REGEX.test(normalized) ? normalized : null;
};

const hashProjectId = (projectId: string) => {
  let hash = 0;

  for (let index = 0; index < projectId.length; index += 1) {
    hash = (hash * 31 + projectId.charCodeAt(index)) | 0;
  }

  return Math.abs(hash);
};

export const getProjectFallbackColor = (projectId: string) =>
  PROJECT_COLOR_PALETTE[hashProjectId(projectId) % PROJECT_COLOR_PALETTE.length];

export const resolveProjectColor = (
  project: { id: string; color?: string | null } | null | undefined
) => {
  if (!project) return null;
  return normalizeProjectColor(project.color) || getProjectFallbackColor(project.id);
};

export const getRandomProjectColor = () =>
  PROJECT_COLOR_PALETTE[Math.floor(Math.random() * PROJECT_COLOR_PALETTE.length)];

export const projectColorToRgba = (color: string, alpha: number) => {
  const normalized = normalizeProjectColor(color);
  if (!normalized) return `rgba(100, 116, 139, ${alpha})`;

  const red = Number.parseInt(normalized.slice(1, 3), 16);
  const green = Number.parseInt(normalized.slice(3, 5), 16);
  const blue = Number.parseInt(normalized.slice(5, 7), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};
