"use client";

import { useState, useMemo } from "react";
import { Profile, TaskAssignee } from "@/types/database";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useWorkspaceUsers } from "@/contexts/WorkspaceUsersContext";

interface TaskAssigneesProps {
  taskId: string;
  assignees: Profile[];
  onAssigneesChange: (assignees: Profile[]) => void;
}

export function TaskAssignees({ taskId, assignees, onAssigneesChange }: TaskAssigneesProps) {
  const { users: workspaceUsers } = useWorkspaceUsers();
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  
  // Map workspace users to Profile format
  const users = useMemo<Profile[]>(() => {
    return workspaceUsers
      .filter(wu => wu.profiles)
      .map(wu => wu.profiles as Profile);
  }, [workspaceUsers]);

  const handleAssignUser = async () => {
    if (!selectedUserId) return;

    const user = users.find(u => u.id === selectedUserId);
    if (!user) return;

    // Check if user is already assigned
    if (assignees.some(a => a.id === user.id)) {
      toast({
        title: "Chyba",
        description: "Používateľ je už priradený k tejto úlohe",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/assignees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigneeIds: [...assignees.map((a) => a.id), selectedUserId] }),
      });

      const result = await response.json();
      if (result.success) {
        onAssigneesChange([...assignees, user]);
        setSelectedUserId("");
        setIsDialogOpen(false);
        toast({
          title: "Úspech",
          description: "Používateľ bol priradený k úlohe",
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa priradiť používateľa",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveAssignee = async (assigneeId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/assignees/${assigneeId}`, {
        method: "DELETE",
      });

      const result = await response.json();
      if (result.success) {
        onAssigneesChange(assignees.filter(a => a.id !== assigneeId));
        toast({
          title: "Úspech",
          description: "Používateľ bol odstránený z úlohy",
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa odstrániť používateľa",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const availableUsers = users.filter(user => 
    !assignees.some(assignee => assignee.id === user.id)
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Priradení používatelia</h4>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" />
              Pridať
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Priradiť používateľa</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Vyberte používateľa" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {getInitials(user.display_name || user.email)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{user.display_name || user.email}</span>
                        <Badge variant="secondary" className="text-xs">
                          {user.role}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Zrušiť
                </Button>
                <Button
                  onClick={handleAssignUser}
                  disabled={!selectedUserId || isLoading}
                >
                  Priradiť
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {assignees.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-4">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
          Žiadni priradení používatelia
        </div>
      ) : (
        <div className="space-y-2">
          {assignees.map((assignee) => (
            <div
              key={assignee.id}
              className="flex items-center justify-between p-2 border rounded-lg"
            >
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-sm">
                    {getInitials(assignee.display_name || assignee.email)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-sm font-medium">{assignee.display_name || assignee.email}</div>
                  <div className="text-xs text-muted-foreground">{assignee.email}</div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {assignee.role}
                </Badge>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleRemoveAssignee(assignee.id)}
                disabled={isLoading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
