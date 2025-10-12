"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Workspace } from "@/types/workspace";

interface WorkspaceContextType {
  workspace: Workspace | null;
  workspaces: Workspace[];
  loading: boolean;
  refreshWorkspace: () => Promise<void>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshWorkspace = async () => {
    try {
      const response = await fetch("/api/workspaces");
      const result = await response.json();

      if (result.success) {
        const allWorkspaces = Array.isArray(result.data) ? result.data : [result.data];
        setWorkspaces(allWorkspaces);
        
        // Set current workspace to the first one (or the one from localStorage)
        const savedWorkspaceId = localStorage.getItem('currentWorkspaceId');
        const currentWorkspace = savedWorkspaceId 
          ? allWorkspaces.find(w => w.id === savedWorkspaceId) || allWorkspaces[0]
          : allWorkspaces[0];
        
        setWorkspace(currentWorkspace);
        
        // Set cookie for server-side access
        if (currentWorkspace) {
          document.cookie = `currentWorkspaceId=${currentWorkspace.id}; path=/; max-age=31536000`; // 1 year
        }
      } else {
        console.error("Failed to fetch workspaces:", result.error);
        setWorkspace(null);
        setWorkspaces([]);
      }
    } catch (error) {
      console.error("Error fetching workspaces:", error);
    } finally {
      setLoading(false);
    }
  };

  const switchWorkspace = async (workspaceId: string) => {
    const targetWorkspace = workspaces.find(w => w.id === workspaceId);
    if (targetWorkspace) {
      setWorkspace(targetWorkspace);
      localStorage.setItem('currentWorkspaceId', workspaceId);
      
      // Set cookie for server-side access
      document.cookie = `currentWorkspaceId=${workspaceId}; path=/; max-age=31536000`; // 1 year
      
      // Refresh the page to reload all data with new workspace
      window.location.reload();
    }
  };

  useEffect(() => {
    refreshWorkspace();
  }, []);

  const value = {
    workspace,
    workspaces,
    loading,
    refreshWorkspace,
    switchWorkspace,
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
