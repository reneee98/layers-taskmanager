"use client";

import { useContext, useState, useEffect } from "react";
import { WorkspaceContext } from "@/contexts/WorkspaceContext";
import { PermissionContext } from "@/contexts/PermissionContext";
import { useAuth } from "@/contexts/AuthContext";
import { checkPermission } from "@/lib/auth/permissions-client";

/**
 * Hook to check if current user has a specific permission
 * Uses PermissionContext if available, otherwise falls back to individual API call
 */
export function usePermission(resource: string, action: string) {
  // Try to use PermissionContext first (optimized path)
  const permissionContext = useContext(PermissionContext);
  const workspaceContext = useContext(WorkspaceContext);
  const { profile } = useAuth();
  const workspace = workspaceContext?.workspace || null;
  
  // Always declare hooks in the same order
  const [fallbackPermission, setFallbackPermission] = useState<boolean>(false);
  const [fallbackLoading, setFallbackLoading] = useState(true);

  // Fallback: use individual API call only if PermissionContext is not available
  useEffect(() => {
    // Skip if PermissionContext is available
    if (permissionContext) {
      return;
    }
    
    const check = async () => {
      setFallbackLoading(true);
      const result = await checkPermission(resource, action, workspace?.id);
      setFallbackPermission(result);
      setFallbackLoading(false);
    };

    check();
  }, [resource, action, workspace?.id, permissionContext]);

  // If PermissionContext is available, use it
  if (permissionContext) {
    // Check if user is workspace owner or admin - they have all permissions
    const workspaceRole = workspaceContext?.workspaceRole;
    const workspace = workspaceContext?.workspace;
    
    // Check if user is workspace owner
    // Priority: workspaceRole?.role === 'owner' > workspace.owner_id === profile?.id
    const isOwnerByRole = workspaceRole?.role === 'owner';
    const isOwnerByWorkspace = workspace && profile && workspace.owner_id === profile.id;
    const isOwner = isOwnerByRole || isOwnerByWorkspace;
    
    // Check if user is admin (admins have all permissions)
    const isAdmin = profile?.role === 'admin';
    
    // If owner or admin, return true immediately (don't wait for permissions to load)
    if (isOwner || isAdmin) {
      return {
        hasPermission: true,
        isLoading: false,
      };
    }
    
    return {
      hasPermission: permissionContext.hasPermission(resource, action),
      isLoading: permissionContext.loading,
    };
  }
  
  return { hasPermission: fallbackPermission, isLoading: fallbackLoading };
}

/**
 * Hook to check multiple permissions at once
 * Uses PermissionContext if available, otherwise falls back to individual API calls
 */
export function usePermissions(permissions: Array<{ resource: string; action: string }>) {
  const permissionContext = useContext(PermissionContext);
  const workspaceContext = useContext(WorkspaceContext);
  const workspace = workspaceContext?.workspace || null;
  
  const [fallbackPermissionMap, setFallbackPermissionMap] = useState<Record<string, boolean>>({});
  const [fallbackLoading, setFallbackLoading] = useState(true);

  // Fallback: use individual API calls only if PermissionContext is not available
  useEffect(() => {
    // Skip if PermissionContext is available
    if (permissionContext) {
      return;
    }
    
    const check = async () => {
      setFallbackLoading(true);
      const results: Record<string, boolean> = {};
      
      for (const perm of permissions) {
        const key = `${perm.resource}.${perm.action}`;
        results[key] = await checkPermission(perm.resource, perm.action, workspace?.id);
      }
      
      setFallbackPermissionMap(results);
      setFallbackLoading(false);
    };

    check();
  }, [permissions, workspace?.id, permissionContext]);

  // If PermissionContext is available, use it
  if (permissionContext) {
    const workspaceRole = workspaceContext?.workspaceRole;
    const workspace = workspaceContext?.workspace;
    const { profile } = useAuth();
    const isOwner = workspaceRole?.role === 'owner' || (workspace && workspace.owner_id === profile?.id);
    const isAdmin = profile?.role === 'admin';
    
    const hasPermission = (resource: string, action: string) => {
      // If owner or admin, return true immediately
      if (isOwner || isAdmin) {
        return true;
      }
      return permissionContext.hasPermission(resource, action);
    };
    
    return { hasPermission, isLoading: permissionContext.loading };
  }

  const hasPermission = (resource: string, action: string) => {
    const key = `${resource}.${action}`;
    return fallbackPermissionMap[key] === true;
  };

  return { hasPermission, isLoading: fallbackLoading };
}

