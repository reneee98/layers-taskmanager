"use client";

import { useState, useEffect } from "react";
import { useContext } from "react";
import { WorkspaceContext } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";

interface WorkspaceRole {
  role: string; // System role name or custom role name
  role_id?: string; // Custom role ID if user has custom role
}

export const useWorkspaceRole = (): WorkspaceRole | null => {
  const { user } = useAuth();
  const workspaceContext = useContext(WorkspaceContext);
  const workspace = workspaceContext?.workspace;
  const [workspaceRole, setWorkspaceRole] = useState<WorkspaceRole | null>(null);

  useEffect(() => {
    const fetchWorkspaceRole = async () => {
      if (!user || !workspace) {
        setWorkspaceRole(null);
        return;
      }

      try {
        // Check if user is workspace owner
        if (workspace.owner_id === user.id) {
          setWorkspaceRole({ role: 'owner' });
          return;
        }

        // Fetch member role from workspace_members
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();

        const { data: member, error: memberError } = await supabase
          .from('workspace_members')
          .select('role')
          .eq('workspace_id', workspace.id)
          .eq('user_id', user.id)
          .single();

        if (memberError || !member) {
          setWorkspaceRole(null);
          return;
        }

        // Check if user has custom role
        const { data: userRole, error: userRoleError } = await supabase
          .from('user_roles')
          .select('role_id, roles!inner(name)')
          .eq('user_id', user.id)
          .eq('workspace_id', workspace.id)
          .single();

        if (!userRoleError && userRole) {
          const role = userRole.roles as any;
          setWorkspaceRole({
            role: role.name,
            role_id: userRole.role_id
          });
        } else {
          // Use system role from workspace_members
          setWorkspaceRole({ role: member.role });
        }
      } catch (error) {
        console.error("Error fetching workspace role:", error);
        setWorkspaceRole(null);
      }
    };

    fetchWorkspaceRole();
  }, [user, workspace]);

  return workspaceRole;
};

