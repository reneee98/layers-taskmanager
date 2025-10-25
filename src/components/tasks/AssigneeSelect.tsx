"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Profile } from "@/types/database";

interface AssigneeSelectProps {
  taskId: string;
  currentAssignees: Profile[];
  onAssigneesChange: (assignees: Profile[]) => void;
}

export function AssigneeSelect({
  taskId,
  currentAssignees,
  onAssigneesChange,
}: AssigneeSelectProps) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<Profile[]>([]);
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

  const handleUserSelect = async (user: Profile) => {
    const isAlreadyAssigned = currentAssignees.some(
      (assignee) => assignee.id === user.id
    );

    if (isAlreadyAssigned) {
      // Remove user from assignees
      const newAssignees = currentAssignees.filter(
        (assignee) => assignee.id !== user.id
      );
      onAssigneesChange(newAssignees);
    } else {
      // Add user to assignees
      const newAssignees = [...currentAssignees, user];
      onAssigneesChange(newAssignees);
    }
  };

  const handleRemoveAssignee = (userId: string) => {
    const newAssignees = currentAssignees.filter(
      (assignee) => assignee.id !== userId
    );
    onAssigneesChange(newAssignees);
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
    <div className="flex items-center gap-2">
      {/* Current assignees */}
      {currentAssignees.map((assignee) => (
        <div
          key={assignee.id}
          className="flex items-center gap-1 bg-muted rounded-full px-2 py-1"
        >
          <Avatar className="h-5 w-5">
            <AvatarFallback className="text-xs">
              {getInitials(assignee.display_name || assignee.email)}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs">{(assignee.display_name || assignee.email).split(" ")[0]}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => handleRemoveAssignee(assignee.id)}
          >
            ×
          </Button>
        </div>
      ))}

      {/* Add assignee button */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-6 w-6 p-0"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0">
          <Command>
            <CommandInput placeholder="Hľadať používateľov..." />
            <CommandList>
              <CommandEmpty>Žiadni používatelia.</CommandEmpty>
              <CommandGroup>
                {users.map((user) => {
                  const isAssigned = currentAssignees.some(
                    (assignee) => assignee.id === user.id
                  );
                  return (
                    <CommandItem
                      key={user.id}
                      value={user.display_name || user.email}
                      onSelect={() => handleUserSelect(user)}
                      className="flex items-center gap-2"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {getInitials(user.display_name || user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="flex-1">{user.display_name || user.email}</span>
                      <Check
                        className={cn(
                          "h-4 w-4",
                          isAssigned ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
