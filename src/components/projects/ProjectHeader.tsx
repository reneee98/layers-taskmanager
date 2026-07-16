"use client";

import type { Project, Task } from "@/types/database";
import dynamic from "next/dynamic";
import { Badge } from "@/components/ui/badge";
import { normalizeCurrency } from "@/lib/currency";
import { projectColorToRgba, resolveProjectColor } from "@/lib/project-colors";
import { FolderKanban } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";

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
  const projectColor = resolveProjectColor(project);
  const statusLabels: Record<string, string> = {
    draft: "Návrh",
    active: "Aktívny",
    on_hold: "Pozastavený",
    sent_to_client: "U klienta",
    completed: "Dokončený",
    cancelled: "Zrušený",
  };

  return (
    <div className="space-y-5">
      <div
        className="surface-panel p-4 sm:p-5"
        style={
          projectColor
            ? {
                borderColor: projectColorToRgba(projectColor, 0.12),
                boxShadow: `inset 2px 0 0 ${projectColorToRgba(projectColor, 0.42)}`,
                backgroundImage: `linear-gradient(90deg, ${projectColorToRgba(
                  projectColor,
                  0.025
                )} 0, transparent 420px)`,
              }
            : undefined
        }
      >
        <PageHeader
          title={project.name}
          description={
            project.description ||
            (!isPersonalProject
              ? "Prehľad úloh, času a rozpočtu projektu."
              : "Vaše osobné úlohy mimo klientskych projektov.")
          }
          eyebrow={!isPersonalProject ? project.client?.name || "Projekt bez klienta" : "Osobný projekt"}
          icon={FolderKanban}
          meta={
            <div className="flex flex-wrap items-center gap-2">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 shrink-0 rounded-full opacity-75 ring-1 ring-black/5"
                style={{ backgroundColor: projectColor || undefined }}
              />
              {!isPersonalProject && project.code && (
                <Badge variant="outline" className="font-mono text-[10px] font-medium">
                  {project.code}
                </Badge>
              )}
              <Badge variant="secondary" className="text-[10px] font-medium">
                {statusLabels[project.status] || project.status}
              </Badge>
              <Badge variant="outline" className="text-[10px] font-medium">
                {normalizeCurrency(project.currency)}
              </Badge>
            </div>
          }
          actions={<ProjectReportGenerator project={project} tasks={tasks} />}
        />
      </div>

      <ProjectSummary projectId={project.id} onUpdate={onUpdate} />
    </div>
  );
};
