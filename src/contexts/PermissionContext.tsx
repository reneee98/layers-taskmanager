"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { WorkspaceContext } from "./WorkspaceContext";
import { useAuth } from "./AuthContext";

interface PermissionContextType {
  permissions: Record<string, boolean>;
  loading: boolean;
  hasPermission: (resource: string, action: string) => boolean;
  refreshPermissions: () => Promise<void>;
}

export const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

// Common permissions used across the app
const COMMON_PERMISSIONS = [
  { resource: 'pages', action: 'view_dashboard' },
  { resource: 'pages', action: 'view_projects' },
  { resource: 'pages', action: 'view_clients' },
  { resource: 'pages', action: 'view_tasks' },
  { resource: 'pages', action: 'view_invoices' },
  { resource: 'pages', action: 'view_settings' },
  { resource: 'pages', action: 'view_workspace_users' },
  { resource: 'pages', action: 'view_admin_roles' },
  { resource: 'pages', action: 'view_admin_bugs' },
  { resource: 'tasks', action: 'read' },
  { resource: 'tasks', action: 'view' },
  { resource: 'projects', action: 'read' },
  { resource: 'projects', action: 'view' },
  { resource: 'financial', action: 'view_invoices' },
  { resource: 'financial', action: 'view_prices' },
  { resource: 'clients', action: 'read' },
  { resource: 'clients', action: 'view' },
];

const PERMISSIONS_CACHE_KEY = 'permissions_cache';
const PERMISSIONS_CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

interface PermissionsCache {
  permissions: Record<string, boolean>;
  timestamp: number;
}

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const workspaceContext = useContext(WorkspaceContext);
  const workspace = workspaceContext?.workspace;
  const workspaceLoading = workspaceContext?.loading ?? true;
  
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const isFetchingRef = useRef(false);

  // Load from cache immediately (optimistic loading)
  const loadFromCache = (): PermissionsCache | null => {
    try {
      const cached = localStorage.getItem(PERMISSIONS_CACHE_KEY);
      if (!cached) return null;
      
      const data: PermissionsCache = JSON.parse(cached);
      const now = Date.now();
      
      // Check if cache is still valid (5 minutes)
      if (now - data.timestamp < PERMISSIONS_CACHE_EXPIRY) {
        return data;
      }
    } catch (error) {
      console.error("Error loading permissions cache:", error);
    }
    return null;
  };

  // Save to cache
  const saveToCache = (perms: Record<string, boolean>) => {
    try {
      const cacheData: PermissionsCache = {
        permissions: perms,
        timestamp: Date.now(),
      };
      localStorage.setItem(PERMISSIONS_CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error("Error saving permissions cache:", error);
    }
  };

  const fetchPermissions = async (useCache = true) => {
    if (!user || !workspace || isFetchingRef.current) {
      return;
    }

    // Try to load from cache first (optimistic loading)
    if (useCache) {
      const cached = loadFromCache();
      if (cached) {
        setPermissions(cached.permissions);
        setLoading(false);
        // Continue to fetch fresh data in background
      }
    }

    try {
      isFetchingRef.current = true;
      if (!useCache) {
        setLoading(true);
      }

      const response = await fetch('/api/auth/check-permissions-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          permissions: COMMON_PERMISSIONS,
          workspaceId: workspace.id,
        }),
      });

      const result = await response.json();

      if (result.success) {
        const perms = result.permissions || {};
        setPermissions(perms);
        saveToCache(perms);
      } else {
        console.error("Failed to fetch permissions:", result.error);
        // If we have cache, keep using it
        if (!useCache || !loadFromCache()) {
          setPermissions({});
        }
      }
    } catch (error) {
      console.error("Error fetching permissions:", error);
      // If we have cache, keep using it
      if (!useCache || !loadFromCache()) {
        setPermissions({});
      }
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  const refreshPermissions = async () => {
    await fetchPermissions(false);
  };

  const hasPermission = (resource: string, action: string): boolean => {
    const key = `${resource}.${action}`;
    return permissions[key] === true;
  };

  useEffect(() => {
    // Wait for workspace to load, then fetch permissions
    if (user && workspace && !workspaceLoading) {
      fetchPermissions(true);
    } else if (!workspace) {
      setPermissions({});
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, workspace?.id, workspaceLoading]);

  const value = {
    permissions,
    loading,
    hasPermission,
    refreshPermissions,
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error("usePermissions must be used within a PermissionProvider");
  }
  return context;
}

