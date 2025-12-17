"use client";

import { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { useWorkspace } from "./WorkspaceContext";

interface WorkspaceUser {
  id: string;
  user_id: string;
  workspace_id: string;
  role: string;
  role_id?: string;
  joined_at: string;
  profiles: {
    id: string;
    email: string;
    display_name: string;
    avatar_url?: string;
    role?: string;
  };
}

interface WorkspaceUsersContextType {
  users: WorkspaceUser[];
  loading: boolean;
  error: string | null;
  refreshUsers: () => Promise<void>;
}

export const WorkspaceUsersContext = createContext<WorkspaceUsersContextType | undefined>(undefined);

const CACHE_KEY = 'workspace_users_cache';
const CACHE_EXPIRY = 2 * 60 * 1000; // 2 minutes

interface CachedData {
  users: WorkspaceUser[];
  workspaceId: string;
  timestamp: number;
}

export function WorkspaceUsersProvider({ children }: { children: React.ReactNode }) {
  // Safely get workspace context - it might not be available yet
  let workspace = null;
  let workspaceLoading = true;
  
  try {
    const workspaceContext = useWorkspace();
    workspace = workspaceContext.workspace;
    workspaceLoading = workspaceContext.loading;
  } catch {
    // WorkspaceContext not available yet - that's okay
  }
  
  const [users, setUsers] = useState<WorkspaceUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);
  const lastFetchedWorkspaceIdRef = useRef<string | null>(null);

  // Load from cache
  const loadFromCache = useCallback((workspaceId: string): WorkspaceUser[] | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      
      const data: CachedData = JSON.parse(cached);
      const now = Date.now();
      
      // Check if cache is for current workspace and still valid
      if (data.workspaceId === workspaceId && now - data.timestamp < CACHE_EXPIRY) {
        return data.users;
      }
    } catch (err) {
      console.error("Error loading workspace users cache:", err);
    }
    return null;
  }, []);

  // Save to cache
  const saveToCache = useCallback((workspaceId: string, usersData: WorkspaceUser[]) => {
    try {
      const cacheData: CachedData = {
        users: usersData,
        workspaceId,
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (err) {
      console.error("Error saving workspace users cache:", err);
    }
  }, []);

  // Listen for dashboard init data
  useEffect(() => {
    const handleDashboardInit = (event: CustomEvent) => {
      const initData = event.detail;
      if (initData?.workspaceUsers && workspace && initData.workspaceId === workspace.id) {
        // Map init data to WorkspaceUser format
        const mappedUsers = initData.workspaceUsers.map((u: any) => ({
          id: u.id,
          user_id: u.id,
          workspace_id: workspace.id,
          role: u.role,
          joined_at: '',
          profiles: {
            id: u.id,
            email: u.email,
            display_name: u.display_name || u.name,
            avatar_url: u.avatar_url,
            role: u.role
          }
        }));
        setUsers(mappedUsers);
        saveToCache(workspace.id, mappedUsers);
        lastFetchedWorkspaceIdRef.current = workspace.id;
        setLoading(false);
      }
    };

    window.addEventListener('dashboard-init-data' as any, handleDashboardInit as EventListener);
    return () => {
      window.removeEventListener('dashboard-init-data' as any, handleDashboardInit as EventListener);
    };
  }, [workspace?.id, workspace, saveToCache]);

  const fetchUsers = useCallback(async (useCache = true) => {
    if (!workspace || isFetchingRef.current) {
      return;
    }

    // Skip if already fetched for this workspace
    if (lastFetchedWorkspaceIdRef.current === workspace.id && users.length > 0 && useCache) {
      return;
    }

    // Try cache first
    if (useCache) {
      const cached = loadFromCache(workspace.id);
      if (cached) {
        setUsers(cached);
        setLoading(false);
        lastFetchedWorkspaceIdRef.current = workspace.id;
        // Continue to fetch fresh data in background
      }
    }

    try {
      isFetchingRef.current = true;
      if (!useCache) {
        setLoading(true);
      }
      setError(null);

      const response = await fetch(`/api/workspace-users?workspace_id=${workspace.id}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        setUsers(result.data);
        saveToCache(workspace.id, result.data);
        lastFetchedWorkspaceIdRef.current = workspace.id;
      } else {
        throw new Error(result.error || "Failed to fetch users");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      
      // If we have cache, keep using it
      if (useCache) {
        const cached = loadFromCache(workspace.id);
        if (cached) {
          setUsers(cached);
          setError(null);
        }
      }
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [workspace, users.length, loadFromCache, saveToCache]);

  const refreshUsers = useCallback(async () => {
    await fetchUsers(false);
  }, [fetchUsers]);

  // Fetch users when workspace changes - but only if not already cached
  useEffect(() => {
    if (workspace && !workspaceLoading) {
      // Try cache first
      const cached = loadFromCache(workspace.id);
      if (cached && cached.length > 0) {
        setUsers(cached);
        setLoading(false);
        lastFetchedWorkspaceIdRef.current = workspace.id;
        // Don't fetch again if we have cache - wait for dashboard-init-data event
        return;
      }
      // Only fetch if no cache
      fetchUsers(true);
    } else if (!workspace) {
      setUsers([]);
      setLoading(false);
    }
  }, [workspace?.id, workspaceLoading, fetchUsers, loadFromCache]);

  const value = {
    users,
    loading,
    error,
    refreshUsers,
  };

  return (
    <WorkspaceUsersContext.Provider value={value}>
      {children}
    </WorkspaceUsersContext.Provider>
  );
}

export function useWorkspaceUsers() {
  const context = useContext(WorkspaceUsersContext);
  if (context === undefined) {
    throw new Error("useWorkspaceUsers must be used within a WorkspaceUsersProvider");
  }
  return context;
}

