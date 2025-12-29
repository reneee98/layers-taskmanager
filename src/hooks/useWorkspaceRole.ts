"use client";

import { useContext } from "react";
import { WorkspaceContext } from "@/contexts/WorkspaceContext";

interface WorkspaceRole {
  role: string; // System role name or custom role name
  role_id?: string; // Custom role ID if user has custom role
}

/**
 * Hook to get current user's workspace role
 * Uses WorkspaceContext for optimized loading (role is fetched once in context)
 */
export const useWorkspaceRole = (): WorkspaceRole | null => {
  const workspaceContext = useContext(WorkspaceContext);
  
  // Return role from context if available
  if (workspaceContext?.workspaceRole) {
    return workspaceContext.workspaceRole;
  }
  
  return null;
};

