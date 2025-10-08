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
import { User } from "@/types/database";

interface SimpleAssigneeSelectProps {
  taskId: string;
  currentAssignee: User | null;
  onAssigneeChange: (assignee: User | null) => void;
}

export function SimpleAssigneeSelect({
  taskId,
  currentAssignee,
  onAssigneeChange,
}: SimpleAssigneeSelectProps) {
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
      const response = await fetch("/api/users");
      const result = await response.json();
      if (result.success) {
        setUsers(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAssigneeChange = async (userId: string) => {
    if (userId === "none") {
      onAssigneeChange(null);
      return;
    }

    const user = users.find(u => u.id === userId);
    if (user) {
      onAssigneeChange(user);
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
                  {getInitials(currentAssignee.name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs">{currentAssignee.name.split(" ")[0]}</span>
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
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <span>{user.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
