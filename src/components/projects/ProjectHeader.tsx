"use client";

import type { Project, Task } from "@/types/database";
import dynamic from "next/dynamic";

// Lazy load components
const ProjectSummary = dynamic(() => import("./ProjectSummary").then(mod => ({ default: mod.ProjectSummary })), {
  loading: () => <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="h-24 bg-muted animate-pulse rounded"></div>
    ))}
  </div>,
});

const ProjectReportGenerator = dynamic(() => import("../reports/ProjectReportGenerator").then(mod => ({ default: mod.ProjectReportGenerator })), {
  loading: () => <div className="h-10 w-32 bg-muted animate-pulse rounded"></div>,
});

interface ProjectHeaderProps {
  project: Project;
  tasks: Task[];
  onUpdate: (refreshFn: () => Promise<void>) => void;
}

export const ProjectHeader = ({ project, tasks, onUpdate }: ProjectHeaderProps) => {
  const isPersonalProject = project.name === "Osobné úlohy" || 
    (project.code && (project.code === "PERSONAL" || project.code.startsWith("PERSONAL-"))) ||
    !project.code;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{project.name}</h1>
            {!isPersonalProject && project.code && (
            <span className="font-mono text-sm text-muted-foreground">{project.code}</span>
            )}
          </div>
          {project.description && (
            <p className="mt-2 text-muted-foreground">{project.description}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <ProjectReportGenerator project={project} tasks={tasks} />
        </div>
      </div>

      {!isPersonalProject && (
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Klient:</span>
          <span className="font-medium">{project.client?.name || 'Bez klienta'}</span>
        </div>
      </div>
      )}

          {/* Project Summary */}
          <ProjectSummary projectId={project.id} onUpdate={onUpdate} />
    </div>
  );
};

