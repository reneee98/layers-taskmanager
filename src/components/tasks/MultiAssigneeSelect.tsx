"use client";

import { useState, useEffect } from "react";
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
import { User, TaskAssignee } from "@/types/database";
import { X, Plus } from "lucide-react";

interface MultiAssigneeSelectProps {
  taskId: string;
  currentAssignees: TaskAssignee[];
  onAssigneesChange: (assignees: TaskAssignee[]) => void;
}

export function MultiAssigneeSelect({
  taskId,
  currentAssignees,
  onAssigneesChange,
}: MultiAssigneeSelectProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/workspace-users");
      const result = await response.json();
      if (result.success) {
        setUsers(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch workspace users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddAssignee = async (userId: string) => {
    console.log("handleAddAssignee called with userId:", userId);
    console.log("Available users:", users);
    
    if (userId === "none") return;

    const user = users.find(u => u.id === userId);
    if (!user) {
      console.log("User not found:", userId);
      return;
    }

    // Check if user is already assigned
    if (currentAssignees.some(assignee => assignee.user_id === userId)) {
      console.log("User already assigned");
      return;
    }

    console.log("Adding assignee:", user.name, "to task:", taskId);
    console.log("User ID being sent:", userId);
    console.log("User object:", user);

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
      console.log("API response:", result);

      if (result.success) {
        console.log("Assignment successful, refreshing assignees...");
        // Refresh assignees
        const assigneesResponse = await fetch(`/api/tasks/${taskId}/assignees`);
        const assigneesResult = await assigneesResponse.json();
        console.log("Refreshed assignees:", assigneesResult);
        if (assigneesResult.success) {
          console.log("Calling onAssigneesChange with:", assigneesResult.data);
          console.log("First assignee details:", assigneesResult.data[0]);
          console.log("User in assignee:", assigneesResult.data[0]?.user);
          onAssigneesChange(assigneesResult.data);
        } else {
          console.error("Failed to refresh assignees:", assigneesResult.error);
        }
      } else {
        console.error("Failed to add assignee:", result.error);
      }
    } catch (error) {
      console.error("Failed to add assignee:", error);
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
        }
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

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Current assignees */}
      {currentAssignees.map((assignee) => (
        <Badge
          key={assignee.id}
          variant="secondary"
          className="h-7 px-2 py-1 text-xs flex items-center gap-1"
        >
          <Avatar className="h-4 w-4">
            <AvatarFallback className="text-xs">
              {getInitials(assignee.user?.display_name || assignee.user?.name || "")}
            </AvatarFallback>
          </Avatar>
          <span>{(assignee.user?.display_name || assignee.user?.name || "").split(" ")[0]}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => handleRemoveAssignee(assignee.user_id)}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      ))}

      {/* Add assignee select */}
      <Select onValueChange={handleAddAssignee}>
        <SelectTrigger className="h-7 px-2 py-1 text-xs border-dashed hover:border-solid transition-colors w-auto max-w-[120px]">
          <SelectValue placeholder="+ Priradiť">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Plus className="h-3 w-3" />
              <span className="text-xs">Priradiť</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {users
            .filter(user => !currentAssignees.some(assignee => assignee.user_id === user.id))
            .map((user) => (
              <SelectItem key={user.id} value={user.id}>
                <div className="flex items-center gap-2">
                  <Avatar className="h-4 w-4">
                    <AvatarFallback className="text-xs">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span>{user.name}</span>
                </div>
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
}
