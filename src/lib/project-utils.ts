import type { Project } from "@/types/database";

/**
 * Check if a project is archived
 * A project is archived if:
 * - status is 'completed' or 'cancelled'
 * - OR it has invoiced tasks (handled by backend)
 */
export const isProjectArchived = (project: Project | null | undefined): boolean => {
  if (!project) return false;
  return project.status === 'completed' || project.status === 'cancelled';
};

