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
import { Profile } from "@/types/database";
import { useWorkspaceUsers } from "@/contexts/WorkspaceUsersContext";

interface SimpleAssigneeSelectProps {
  taskId: string;
  currentAssignee: Profile | null;
  onAssigneeChange: (assignee: Profile | null) => void;
}

export function SimpleAssigneeSelect({
  taskId,
  currentAssignee,
  onAssigneeChange,
}: SimpleAssigneeSelectProps) {
  const { users: workspaceUsers, loading: isLoading } = useWorkspaceUsers();
  
  // Map workspace users to Profile format
  const users = useMemo(() => {
    return workspaceUsers
      .filter(wu => wu.profiles)
      .map(wu => wu.profiles as Profile);
  }, [workspaceUsers]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const handleAssigneeChange = async (userId: string) => {
    if (userId === "none") {
      // Remove assignee
      try {
        const response = await fetch(`/api/tasks/${taskId}/assignees`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            assigneeIds: [],
          }),
        });

        const result = await response.json();

        if (result.success) {
          onAssigneeChange(null);
        } else {
          console.error("Failed to remove assignee:", result.error);
        }
      } catch (error) {
        console.error("Failed to remove assignee:", error);
      }
      return;
    }

    const user = users.find(u => u.id === userId);
    if (user) {
      // Add assignee
      try {
        const response = await fetch(`/api/tasks/${taskId}/assignees`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            assigneeIds: [userId],
          }),
        });

        const result = await response.json();

        if (result.success) {
          onAssigneeChange(user);
        } else {
          console.error("Failed to add assignee:", result.error);
        }
      } catch (error) {
        console.error("Failed to add assignee:", error);
      }
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

  return (
    <Select
      value={currentAssignee?.id || "none"}
      onValueChange={handleAssigneeChange}
    >
      <SelectTrigger className="h-7 px-2 py-1 text-xs border-dashed hover:border-solid transition-colors w-auto max-w-[200px]">
        <SelectValue>
          {currentAssignee ? (
            <div className="flex items-center gap-1">
              <Avatar className="h-4 w-4">
                <AvatarFallback className="text-xs">
                  {getInitials(currentAssignee.display_name || currentAssignee.email)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs">{(currentAssignee.display_name || currentAssignee.email).split(" ")[0]}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-muted-foreground">
              <div className="h-3 w-3 rounded-full border border-dashed border-muted-foreground/50 flex items-center justify-center">
                <span className="text-xs leading-none">+</span>
              </div>
              <span className="text-xs">Priradiť</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Odstrániť priradenie</SelectItem>
        {users.map((user) => (
          <SelectItem key={user.id} value={user.id}>
            <div className="flex items-center gap-2">
              <Avatar className="h-4 w-4">
                <AvatarFallback className="text-xs">
                  {getInitials(user.display_name || user.email)}
                </AvatarFallback>
              </Avatar>
              <span>{user.display_name || user.email}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
