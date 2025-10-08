"use client";

import type { Project, Task } from "@/types/database";
import { ProjectSummary } from "./ProjectSummary";
import { ProjectReportGenerator } from "../reports/ProjectReportGenerator";

interface ProjectHeaderProps {
  project: Project;
  tasks: Task[];
  onUpdate: (refreshFn: () => Promise<void>) => void;
}

export const ProjectHeader = ({ project, tasks, onUpdate }: ProjectHeaderProps) => {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <span className="font-mono text-sm text-muted-foreground">{project.code}</span>
          </div>
          {project.description && (
            <p className="mt-2 text-muted-foreground">{project.description}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <ProjectReportGenerator project={project} tasks={tasks} />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Klient:</span>
          <span className="font-medium">{project.client?.name}</span>
        </div>
      </div>

          {/* Project Summary */}
          <ProjectSummary projectId={project.id} onUpdate={onUpdate} />
    </div>
  );
};

