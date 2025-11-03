"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import type { Task, Project } from "@/types/database";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface TaskDialogProps {
  projectId?: string | null; // Optional - if null, task will be created without project
  task?: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function TaskDialog({
  projectId,
  task,
  open,
  onOpenChange,
  onSuccess,
}: TaskDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Task["status"]>("todo");
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(projectId || null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [workspaceUsers, setWorkspaceUsers] = useState<Array<{ id: string; display_name: string; email: string; role: string }>>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setStatus(task.status);
      setPriority(task.priority);
      setEstimatedHours(task.estimated_hours?.toString() || "");
      // Use task's budget_cents (individual budget for this task)
      setBudgetAmount(task.budget_cents ? (task.budget_cents / 100).toString() : "");
      setDueDate(task.due_date || "");
      setSelectedProjectId(task.project_id);
    } else {
      resetForm();
    }
  }, [task, open]);

  useEffect(() => {
    // Fetch projects and workspace users when dialog is open (both for creating and editing)
    if (open) {
      const fetchProjects = async () => {
        try {
          const response = await fetch("/api/projects");
          const result = await response.json();
          if (result.success) {
            setProjects(result.data);
          }
        } catch (error) {
          console.error("Failed to fetch projects:", error);
        }
      };
      
      const fetchWorkspaceUsers = async () => {
        try {
          const response = await fetch("/api/workspace-users");
          const result = await response.json();
          if (result.success) {
            setWorkspaceUsers(result.data);
          }
        } catch (error) {
          console.error("Failed to fetch workspace users:", error);
        }
      };
      
      fetchProjects();
      fetchWorkspaceUsers();
    }
  }, [open]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStatus("todo");
    setPriority("medium");
    setEstimatedHours("");
    setBudgetAmount("");
    setDueDate("");
    setSelectedProjectId(projectId || null);
    setSelectedAssignees([]);
  };
  
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };
  
  const handleAssigneeToggle = (userId: string) => {
    if (selectedAssignees.includes(userId)) {
      setSelectedAssignees(selectedAssignees.filter(id => id !== userId));
    } else {
      setSelectedAssignees([...selectedAssignees, userId]);
    }
  };
  
  const handleRemoveAssignee = (userId: string) => {
    setSelectedAssignees(selectedAssignees.filter(id => id !== userId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const payload: any = {
        title: title.trim(),
        description: description.trim() || null,
        status,
        priority,
        due_date: dueDate || null,
      };

      // Include project_id only if a project is selected
      if (selectedProjectId) {
        payload.project_id = selectedProjectId;
      } else {
        payload.project_id = null;
      }

      // Only include estimated_hours if it has a value
      if (estimatedHours && estimatedHours.trim() !== "") {
        payload.estimated_hours = parseFloat(estimatedHours);
      }

      // Only include budget_cents if it has a value (individual task budget in cents)
      if (budgetAmount && budgetAmount.trim() !== "") {
        const budgetValue = parseFloat(budgetAmount);
        payload.budget_cents = Math.round(budgetValue * 100);
      }

      const method = task ? "PATCH" : "POST";
      const url = task ? `/api/tasks/${task.id}` : `/api/tasks`;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        // If creating a new task and assignees are selected, assign them
        if (!task && selectedAssignees.length > 0 && result.data?.id) {
          try {
            const assigneeResponse = await fetch(`/api/tasks/${result.data.id}/assignees`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ assigneeIds: selectedAssignees }),
            });
            
            const assigneeResult = await assigneeResponse.json();
            if (!assigneeResult.success) {
              console.error("Failed to assign users to task:", assigneeResult.error);
            }
          } catch (assigneeError) {
            console.error("Error assigning users to task:", assigneeError);
            // Don't fail the entire operation if assignment fails
          }
        }
        
        toast({
          title: "Úspech",
          description: task ? "Úloha bola aktualizovaná" : "Úloha bola vytvorená",
        });
        onSuccess();
        onOpenChange(false);
        resetForm();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: "Chyba",
        description: error.message || "Nepodarilo sa uložiť úlohu",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{task ? "Upraviť úlohu" : "Nová úloha"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project">Projekt</Label>
              <Select 
                value={selectedProjectId || "none"} 
                onValueChange={(val) => setSelectedProjectId(val === "none" ? null : val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Vybrať projekt" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Bez projektu</span>
                    </div>
                  </SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{project.name}</span>
                        <span className="text-xs text-muted-foreground font-mono">
                          ({project.code})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Názov *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Napr. Frontend Development"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Popis</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailný popis úlohy..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(val) => setStatus(val as Task["status"])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priorita</Label>
                <Select value={priority} onValueChange={(val) => setPriority(val as Task["priority"])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="estimatedHours">Odhad hodín</Label>
                <Input
                  id="estimatedHours"
                  type="number"
                  step="0.5"
                  min="0"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                  placeholder="Napr. 40"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="budgetAmount">Rozpočet €</Label>
                <Input
                  id="budgetAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value)}
                  placeholder="Napr. 5000"
                />
                <p className="text-xs text-muted-foreground">
                  Nechajte prázdne pre kalkuláciu z hodín
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Deadline</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            {!task && (
              <div className="space-y-2">
                <Label>Priradiť používateľov</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedAssignees.map((userId) => {
                    const user = workspaceUsers.find(u => u.id === userId);
                    if (!user) return null;
                    return (
                      <Badge
                        key={userId}
                        variant="secondary"
                        className="flex items-center gap-1 px-2 py-1"
                      >
                        <Avatar className="h-4 w-4">
                          <AvatarFallback className="text-xs">
                            {getInitials(user.display_name || user.email)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs">{user.display_name || user.email}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAssignee(userId)}
                          className="ml-1 hover:bg-muted rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
                <Select
                  value=""
                  onValueChange={(value) => {
                    if (value && !selectedAssignees.includes(value)) {
                      handleAssigneeToggle(value);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pridať používateľa" />
                  </SelectTrigger>
                  <SelectContent>
                    {workspaceUsers
                      .filter(user => !selectedAssignees.includes(user.id))
                      .map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {getInitials(user.display_name || user.email)}
                              </AvatarFallback>
                            </Avatar>
                            <span>{user.display_name || user.email}</span>
                            {user.role && (
                              <Badge variant="outline" className="text-xs">
                                {user.role}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Zrušiť
            </Button>
            <Button type="submit" disabled={isLoading || !title.trim()}>
              {isLoading ? "Ukladám..." : task ? "Uložiť zmeny" : "Vytvoriť úlohu"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

