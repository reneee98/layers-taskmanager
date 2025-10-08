"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import type { Project, Task } from "@/types/database";

interface ProjectReportGeneratorProps {
  project: Project;
  tasks: Task[];
}

export const ProjectReportGenerator = ({ project, tasks }: ProjectReportGeneratorProps) => {
  const router = useRouter();

  const openReport = () => {
    router.push(`/projects/${project.id}/report`);
  };

  return (
    <Button
      onClick={openReport}
      variant="outline"
      className="gap-2"
    >
      <FileText className="h-4 w-4" />
      Zobraziť report
    </Button>
  );
};
