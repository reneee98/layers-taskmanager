"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import type { Client, Project } from "@/types/database";
import type { ProjectMembersResponse } from "@/types/project-members";

const ProjectForm = dynamic(() => import("./ProjectForm").then((module) => module.ProjectForm), {
  ssr: false,
});

export const ProjectSettings = ({
  project,
  onSuccess,
}: {
  project: Project;
  onSuccess: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canManageMembers, setCanManageMembers] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    setCanEdit(false);
    setCanManageMembers(false);
    const fetchAccess = async () => {
      try {
        const response = await fetch(`/api/projects/${project.id}/members?access_only=true`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const result: ProjectMembersResponse = await response.json();
        if (response.ok && result.success && !controller.signal.aborted) {
          setCanEdit(Boolean(result.can_edit_project));
          setCanManageMembers(Boolean(result.can_manage_members));
        }
      } catch (error) {
        if (!controller.signal.aborted)
          console.error("Failed to load project settings access:", error);
      }
    };
    void fetchAccess();
    return () => controller.abort();
  }, [project.id]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const fetchClients = async () => {
      try {
        const response = await fetch(`/api/clients?workspace_id=${project.workspace_id}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error("Nepodarilo sa načítať klientov");
        if (!controller.signal.aborted) setClients(result.data ?? []);
      } catch {
        if (!controller.signal.aborted) {
          toast({
            title: "Chyba",
            description: "Nepodarilo sa načítať klientov",
            variant: "destructive",
          });
        }
      }
    };
    void fetchClients();
    return () => controller.abort();
  }, [open, project.workspace_id]);

  if (!canEdit) return null;

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        aria-label="Nastavenia projektu"
        title="Nastavenia projektu"
        onClick={() => setOpen(true)}
      >
        <Settings className="h-4 w-4" />
      </Button>
      {open && (
        <ProjectForm
          project={project}
          clients={clients}
          open={open}
          onOpenChange={setOpen}
          onSuccess={onSuccess}
          showMembers={canManageMembers}
        />
      )}
    </>
  );
};
