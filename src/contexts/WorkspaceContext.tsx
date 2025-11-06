"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { Workspace } from "@/types/workspace";
import { useAuth } from "./AuthContext";

interface WorkspaceRole {
  role: string; // System role name or custom role name
  role_id?: string; // Custom role ID if user has custom role
}

interface WorkspaceContextType {
  workspace: Workspace | null;
  workspaces: Workspace[];
  workspaceRole: WorkspaceRole | null;
  loading: boolean;
  refreshWorkspace: () => Promise<void>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
}

export const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

const CACHE_KEY = 'workspace_init_cache';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

interface CachedData {
  workspaces: Workspace[];
  workspace: Workspace | null;
  workspaceRole: WorkspaceRole | null;
  timestamp: number;
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceRole, setWorkspaceRole] = useState<WorkspaceRole | null>(null);
  const [loading, setLoading] = useState(true);
  const isFetchingRef = useRef(false);

  // Load from cache immediately (optimistic loading)
  const loadFromCache = (): CachedData | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      
      const data: CachedData = JSON.parse(cached);
      const now = Date.now();
      
      // Check if cache is still valid (5 minutes)
      if (now - data.timestamp < CACHE_EXPIRY) {
        return data;
      }
    } catch (error) {
      console.error("Error loading cache:", error);
    }
    return null;
  };

  // Save to cache
  const saveToCache = (data: { workspaces: Workspace[]; workspace: Workspace | null; workspaceRole: WorkspaceRole | null }) => {
    try {
      const cacheData: CachedData = {
        ...data,
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error("Error saving cache:", error);
    }
  };

  const refreshWorkspace = async (useCache = true) => {
    // Prevent multiple simultaneous calls
    if (isFetchingRef.current) {
      return;
    }
    
    // Try to load from cache first (optimistic loading)
    if (useCache) {
      const cached = loadFromCache();
      if (cached) {
        setWorkspaces(cached.workspaces);
        setWorkspace(cached.workspace);
        setWorkspaceRole(cached.workspaceRole);
        setLoading(false);
        // Continue to fetch fresh data in background
      }
    }
    
    try {
      isFetchingRef.current = true;
      if (!useCache) {
        setLoading(true);
      }
      
      // Use optimized init endpoint that returns everything at once
      const response = await fetch("/api/workspaces/init");
      
      if (!response.ok) {
        console.error(`Failed to fetch workspaces: ${response.status} ${response.statusText}`);
        // If we have cache, keep using it
        if (!useCache || !loadFromCache()) {
          setWorkspace(null);
          setWorkspaces([]);
          setWorkspaceRole(null);
        }
        return;
      }
      
      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error("Response is not JSON, got:", contentType);
        if (!useCache || !loadFromCache()) {
          setWorkspace(null);
          setWorkspaces([]);
          setWorkspaceRole(null);
        }
        return;
      }
      
      const result = await response.json();

      if (result.success && result.data) {
        const { workspaces: allWorkspaces, currentWorkspace, workspaceRole: role } = result.data;
        
        setWorkspaces(allWorkspaces);
        setWorkspace(currentWorkspace);
        setWorkspaceRole(role);
        
        // Save to cache
        saveToCache({
          workspaces: allWorkspaces,
          workspace: currentWorkspace,
          workspaceRole: role,
        });
        
        // Set cookie for server-side access
        if (currentWorkspace) {
          document.cookie = `currentWorkspaceId=${currentWorkspace.id}; path=/; max-age=31536000`; // 1 year
          localStorage.setItem('currentWorkspaceId', currentWorkspace.id);
        }
      } else {
        console.error("Failed to fetch workspaces:", result.error);
        if (!useCache || !loadFromCache()) {
          setWorkspace(null);
          setWorkspaces([]);
          setWorkspaceRole(null);
        }
      }
    } catch (error) {
      console.error("Error fetching workspaces:", error);
      // If we have cache, keep using it
      if (!useCache || !loadFromCache()) {
        setWorkspace(null);
        setWorkspaces([]);
        setWorkspaceRole(null);
      }
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  const switchWorkspace = async (workspaceId: string) => {
    const targetWorkspace = workspaces.find(w => w.id === workspaceId);
    if (targetWorkspace) {
      setWorkspace(targetWorkspace);
      localStorage.setItem('currentWorkspaceId', workspaceId);
      
      // Set cookie for server-side access
      document.cookie = `currentWorkspaceId=${workspaceId}; path=/; max-age=31536000`; // 1 year
      
      // Clear cache and refresh
      localStorage.removeItem(CACHE_KEY);
      await refreshWorkspace(false);
      
      // Refresh the page to reload all data with new workspace
      window.location.reload();
    }
  };

  useEffect(() => {
    // Only fetch once on mount, use cache for instant loading
    if (user) {
      refreshWorkspace(true);
    } else {
      setLoading(false);
    }
  }, [user?.id]); // Only depend on user ID

  const value = {
    workspace,
    workspaces,
    workspaceRole,
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
