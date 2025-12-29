"use client";

import { useMemo } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TaskAssignee } from "@/types/database";
import { X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspaceUsers } from "@/contexts/WorkspaceUsersContext";

interface WorkspaceUser {
  id: string;
  email: string;
  name?: string;
  display_name?: string;
  avatar_url?: string | null;
  role?: string;
}

interface MultiAssigneeSelectProps {
  taskId: string;
  currentAssignees: TaskAssignee[];
  onAssigneesChange: (assignees: TaskAssignee[]) => void;
  disabled?: boolean;
  compact?: boolean; // If true, only show the add button (for Figma design)
}

export function MultiAssigneeSelect({
  taskId,
  currentAssignees,
  onAssigneesChange,
  disabled = false,
  compact = false,
}: MultiAssigneeSelectProps) {
  const { users: workspaceUsers, loading: isLoading } = useWorkspaceUsers();
  
  // Map workspace users to the expected format
  const users = useMemo<WorkspaceUser[]>(() => {
    return workspaceUsers
      .filter(wu => wu.profiles)
      .map(wu => ({
        id: wu.profiles.id,
        email: wu.profiles.email,
        name: wu.profiles.display_name,
        display_name: wu.profiles.display_name,
        avatar_url: wu.profiles.avatar_url,
        role: wu.role,
      }));
  }, [workspaceUsers]);

  const getInitials = (name: string | undefined) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const handleAddAssignee = async (userId: string) => {
    if (userId === "none") return;

    const user = users.find(u => u.id === userId);
    if (!user) {
      return;
    }

    // Check if user is already assigned
    if (currentAssignees.some(assignee => assignee.user_id === userId)) {
      return;
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}/assignees`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assigneeIds: [...currentAssignees.map(a => a.user_id), userId],
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Refresh assignees
        const assigneesResponse = await fetch(`/api/tasks/${taskId}/assignees`);
        const assigneesResult = await assigneesResponse.json();
        if (assigneesResult.success) {
          onAssigneesChange(assigneesResult.data);
        } else {
          console.error("[MultiAssigneeSelect] Failed to refresh assignees:", assigneesResult.error);
        }
      } else {
        console.error("[MultiAssigneeSelect] Failed to add assignee:", result.error);
      }
    } catch (error) {
      console.error("[MultiAssigneeSelect] Error adding assignee:", error);
    }
  };

  const handleRemoveAssignee = async (userId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/assignees`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assigneeIds: currentAssignees.filter(a => a.user_id !== userId).map(a => a.user_id),
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Refresh assignees
        const assigneesResponse = await fetch(`/api/tasks/${taskId}/assignees`);
        const assigneesResult = await assigneesResponse.json();
        if (assigneesResult.success) {
          onAssigneesChange(assigneesResult.data);
        } else {
          console.error("[MultiAssigneeSelect] Failed to refresh assignees:", assigneesResult.error);
        }
      } else {
        console.error("[MultiAssigneeSelect] Failed to remove assignee:", result.error);
      }
    } catch (error) {
      console.error("Failed to remove assignee:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-1">
        <div className="h-6 w-6 bg-muted animate-pulse rounded-full" />
        <span className="text-sm text-muted-foreground">Načítavam...</span>
      </div>
    );
  }

  // Compact mode - only show add button (for Figma design)
  if (compact) {
    return (
      <Select onValueChange={handleAddAssignee}>
        <SelectTrigger className="bg-[#f1f5f9] dark:bg-slate-700 border-2 border-solid border-white dark:border-slate-800 overflow-clip p-[2px] rounded-full shadow-[0px_0px_0px_1px_#f1f5f9] dark:shadow-[0px_0px_0px_1px_#334155] h-[28px] w-[28px] cursor-pointer hover:bg-[#e2e8f0] dark:hover:bg-slate-600 transition-colors [&>svg]:hidden">
          <div className="bg-[#ececf0] dark:bg-slate-600 h-[24px] w-[24px] rounded-full flex items-center justify-center">
            <Plus className="text-[#45556c] dark:text-slate-300 size-[12px]" />
          </div>
        </SelectTrigger>
        <SelectContent className="py-2">
          {(() => {
            const availableUsers = users.filter(user => !currentAssignees.some(assignee => assignee.user_id === user.id));
            if (availableUsers.length === 0) {
              return <div className="px-2 py-1.5 text-sm text-muted-foreground">Žiadni dostupní používatelia</div>;
            }
            return availableUsers.map((user) => (
              <SelectItem key={user.id} value={user.id} className="py-2.5">
                <div className="flex items-center gap-2.5">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                      {getInitials(user.name || user.display_name || user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{user.name || user.display_name || user.email || "Neznámy"}</span>
                </div>
              </SelectItem>
            ));
          })()}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Current assignees */}
      {currentAssignees.map((assignee) => (
        <div
          key={assignee.id}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 h-[2.5rem] bg-muted rounded-md border border-border transition-colors",
            disabled ? "cursor-default" : "hover:bg-muted/80"
          )}
        >
          <Avatar className="h-5 w-5">
            <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
              {getInitials(assignee.user?.name || assignee.user?.email || "")}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">
            {assignee.user?.name || assignee.user?.email || "Neznámy"}
          </span>
          {!disabled && (
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={() => handleRemoveAssignee(assignee.user_id)}
              title="Odstrániť"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      ))}

      {/* Add assignee select */}
      {!disabled && (
        <Select onValueChange={handleAddAssignee}>
          <SelectTrigger className="h-[2.5rem] px-3 py-2 text-sm bg-muted rounded-md border border-border hover:bg-muted/80 transition-colors w-auto min-w-[100px]">
            <SelectValue placeholder="+ Priradiť">
              <div className="flex items-center gap-1.5 text-foreground">
                <Plus className="h-3 w-3" />
                <span className="text-sm font-medium">Priradiť</span>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="py-2">
            {(() => {
              const availableUsers = users.filter(user => !currentAssignees.some(assignee => assignee.user_id === user.id));
              return availableUsers.map((user) => (
                <SelectItem key={user.id} value={user.id} className="py-2.5">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                        {getInitials(user.name || user.display_name || user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{user.name || user.display_name || user.email || "Neznámy"}</span>
                  </div>
                </SelectItem>
              ));
            })()}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
