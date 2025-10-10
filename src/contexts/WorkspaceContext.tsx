"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Workspace } from "@/types/workspace";

interface WorkspaceContextType {
  workspace: Workspace | null;
  loading: boolean;
  refreshWorkspace: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshWorkspace = async () => {
    try {
      const response = await fetch("/api/workspaces");
      const result = await response.json();

      if (result.success) {
        setWorkspace(result.data);
      } else {
        console.error("Failed to fetch workspace:", result.error);
        setWorkspace(null);
      }
    } catch (error) {
      console.error("Error fetching workspace:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshWorkspace();
  }, []);

  const value = {
    workspace,
    loading,
    refreshWorkspace,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
