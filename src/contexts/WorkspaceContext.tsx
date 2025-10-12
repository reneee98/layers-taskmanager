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
      console.log("DEBUG: Fetching workspaces...");
      const response = await fetch("/api/workspaces");
      const result = await response.json();

      console.log("DEBUG: Workspaces API response:", result);

      if (result.success) {
        const allWorkspaces = Array.isArray(result.data) ? result.data : [result.data];
        console.log("DEBUG: Available workspaces:", allWorkspaces);
        setWorkspaces(allWorkspaces);
        
        // Set current workspace to the first one (or the one from localStorage)
        const savedWorkspaceId = localStorage.getItem('currentWorkspaceId');
        console.log("DEBUG: Saved workspace ID from localStorage:", savedWorkspaceId);
        
        // Check if saved workspace ID is still valid
        const currentWorkspace = savedWorkspaceId 
          ? allWorkspaces.find((w: any) => w.id === savedWorkspaceId) || allWorkspaces[0]
          : allWorkspaces[0];
        
        // If saved workspace is not available, clear localStorage and use first available
        if (savedWorkspaceId && !allWorkspaces.find((w: any) => w.id === savedWorkspaceId)) {
          console.log("DEBUG: Saved workspace no longer available, clearing localStorage");
          localStorage.removeItem('currentWorkspaceId');
          document.cookie = 'currentWorkspaceId=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        }
        
        console.log("DEBUG: Selected current workspace:", currentWorkspace);
        setWorkspace(currentWorkspace);
        
        // Set cookie for server-side access
        if (currentWorkspace) {
          document.cookie = `currentWorkspaceId=${currentWorkspace.id}; path=/; max-age=31536000`; // 1 year
          console.log("DEBUG: Set cookie for workspace:", currentWorkspace.id);
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
