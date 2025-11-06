"use client";

import { useState, useEffect, useContext } from "react";
import { WorkspaceContext } from "@/contexts/WorkspaceContext";
import { checkPermission } from "@/lib/auth/permissions-client";

/**
 * Hook to check if current user has a specific permission
 */
export function usePermission(resource: string, action: string) {
  // Safely get workspace - use useContext directly to avoid throwing error
  const workspaceContext = useContext(WorkspaceContext);
  const workspace = workspaceContext?.workspace || null;
  
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      setIsLoading(true);
      const result = await checkPermission(resource, action, workspace?.id);
      setHasPermission(result);
      setIsLoading(false);
    };

    check();
  }, [resource, action, workspace?.id]);

  return { hasPermission, isLoading };
}

/**
 * Hook to check multiple permissions at once
 */
export function usePermissions(permissions: Array<{ resource: string; action: string }>) {
  // Safely get workspace - use useContext directly to avoid throwing error
  const workspaceContext = useContext(WorkspaceContext);
  const workspace = workspaceContext?.workspace || null;
  
  const [permissionMap, setPermissionMap] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      setIsLoading(true);
      const results: Record<string, boolean> = {};
      
      for (const perm of permissions) {
        const key = `${perm.resource}.${perm.action}`;
        results[key] = await checkPermission(perm.resource, perm.action, workspace?.id);
      }
      
      setPermissionMap(results);
      setIsLoading(false);
    };

    check();
  }, [permissions, workspace?.id]);

  const hasPermission = (resource: string, action: string) => {
    const key = `${resource}.${action}`;
    return permissionMap[key] === true;
  };

  return { hasPermission, isLoading };
}

