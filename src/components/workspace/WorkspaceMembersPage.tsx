"use client";

import { useWorkspace } from "@/contexts/WorkspaceContext";
import { WorkspaceMembers } from "./WorkspaceMembers";
import { Loader2 } from "lucide-react";

export function WorkspaceMembersPage() {
  const { workspace, loading } = useWorkspace();

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Načítavam...</span>
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Žiadny workspace</h1>
          <p className="text-muted-foreground mt-2">
            Nemáte prístup k žiadnemu workspace
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Správa používateľov</h1>
        <p className="text-muted-foreground mt-2">
          Spravujte používateľov vo workspace: <strong>{workspace.name}</strong>
        </p>
      </div>
      
      <WorkspaceMembers workspaceId={workspace.id} />
    </div>
  );
}
