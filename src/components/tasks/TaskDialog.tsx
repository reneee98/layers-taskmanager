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
import { StatusSelect } from "@/components/tasks/StatusSelect";
import { PrioritySelect } from "@/components/tasks/PrioritySelect";
import { DateRangePicker } from "@/components/ui/date-range-picker";
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
  const [hourlyRate, setHourlyRate] = useState("");
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(projectId || null);
  const [projects, setProjects] = useState<Project[]>([]);
  
  // Reset selectedProjectId when projectId prop changes
  useEffect(() => {
    if (open && !task) {
      setSelectedProjectId(projectId || null);
    }
  }, [projectId, open, task]);
  const [workspaceUsers, setWorkspaceUsers] = useState<Array<{ id: string; display_name: string; email: string; role: string }>>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [isBudgetAutoCalculated, setIsBudgetAutoCalculated] = useState(false);
  const [userSettings, setUserSettings] = useState<{ default_hourly_rate?: number | null } | null>(null);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setStatus(task.status);
      setPriority(task.priority);
      setEstimatedHours(task.estimated_hours?.toString() || "");
      // Use task's budget_cents (individual budget for this task)
      setBudgetAmount(task.budget_cents ? (task.budget_cents / 100).toString() : "");
      setHourlyRate(task.hourly_rate_cents ? (task.hourly_rate_cents / 100).toString() : "");
      setDueDate(task.due_date || null);
      setStartDate(task.start_date || null);
      setSelectedProjectId(task.project_id);
      // Budget was loaded from task, not auto-calculated
      setIsBudgetAutoCalculated(false);
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

      const fetchUserSettings = async () => {
        try {
          const response = await fetch("/api/me/settings");
          const result = await response.json();
          if (result.success) {
            setUserSettings(result.data);
          }
        } catch (error) {
          console.error("Failed to fetch user settings:", error);
        }
      };
      
      fetchProjects();
      fetchWorkspaceUsers();
      fetchUserSettings();
    }
  }, [open]);

  // Auto-calculate budget when estimated_hours, project, or hourly rate changes
  useEffect(() => {
    if (estimatedHours && estimatedHours.trim() !== "") {
      const hours = parseFloat(estimatedHours);
      if (hours > 0 && !isNaN(hours)) {
        let hourlyRateValue: number | null = null;
        
        // Priority 1: Task hourly rate (for tasks without project)
        if (!selectedProjectId && hourlyRate && hourlyRate.trim() !== "") {
          hourlyRateValue = parseFloat(hourlyRate);
        }
        // Priority 2: Project hourly rate
        else if (selectedProjectId) {
          const project = projects.find(p => p.id === selectedProjectId);
          if (project?.hourly_rate_cents) {
            hourlyRateValue = project.hourly_rate_cents / 100;
          }
        }
        // Priority 3: User default hourly rate (for tasks without project)
        else if (!selectedProjectId && userSettings?.default_hourly_rate != null) {
          hourlyRateValue = userSettings.default_hourly_rate;
        }
        
        if (hourlyRateValue && hourlyRateValue > 0) {
          const calculatedBudget = hours * hourlyRateValue;
          
          // Only auto-calculate if:
          // 1. It's a new task (no task), OR
          // 2. It's an existing task but budget was previously auto-calculated
          if (!task || isBudgetAutoCalculated) {
            setBudgetAmount(calculatedBudget.toFixed(2));
            setIsBudgetAutoCalculated(true);
          }
        } else {
          if (isBudgetAutoCalculated) {
            setBudgetAmount("");
            setIsBudgetAutoCalculated(false);
          }
        }
      } else {
        if (isBudgetAutoCalculated) {
          setBudgetAmount("");
          setIsBudgetAutoCalculated(false);
        }
      }
    } else {
      // If estimated hours is cleared, clear budget if it was auto-calculated
      if (isBudgetAutoCalculated) {
        setBudgetAmount("");
        setIsBudgetAutoCalculated(false);
      }
    }
  }, [estimatedHours, selectedProjectId, projects, hourlyRate, userSettings, task, isBudgetAutoCalculated]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStatus("todo");
    setPriority("medium");
    setEstimatedHours("");
    setBudgetAmount("");
    setHourlyRate("");
    setDueDate(null);
    setStartDate(null);
    setSelectedProjectId(projectId || null);
    setSelectedAssignees([]);
    setIsBudgetAutoCalculated(false);
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
        start_date: startDate || null,
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

      // Only include budget_cents if it was manually set (not auto-calculated)
      // If budget was auto-calculated, don't send it - let API calculate it from estimated_hours
      if (budgetAmount && budgetAmount.trim() !== "" && !isBudgetAutoCalculated) {
        const budgetValue = parseFloat(budgetAmount);
        payload.budget_cents = Math.round(budgetValue * 100);
      }
      // If budget was auto-calculated, don't send budget_cents - API will calculate it automatically

      // Include hourly_rate_cents only for tasks without project
      if (!selectedProjectId && hourlyRate && hourlyRate.trim() !== "") {
        const hourlyRateValue = parseFloat(hourlyRate);
        payload.hourly_rate_cents = Math.round(hourlyRateValue * 100);
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
                    <span className="text-muted-foreground">Bez projektu</span>
                  </SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{project.name}</span>
                        {project.code && (
                          <span className="text-xs text-muted-foreground font-mono">
                            ({project.code})
                          </span>
                        )}
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
                <StatusSelect 
                  status={status} 
                  onStatusChange={(val) => setStatus(val as Task["status"])}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priorita</Label>
                <PrioritySelect 
                  priority={priority} 
                  onPriorityChange={(val) => setPriority(val as Task["priority"])}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Dátum</Label>
              <DateRangePicker
                startDate={startDate}
                endDate={dueDate}
                onSave={async (start, end) => {
                  setStartDate(start);
                  setDueDate(end);
                }}
                placeholder="Nastaviť dátum"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="estimatedHours">Odhad hodín</Label>
                <Input
                  id="estimatedHours"
                  type="number"
                  step="0.25"
                  min="0"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                  placeholder="0"
                />
              </div>

              {!selectedProjectId && (
                <div className="space-y-2">
                  <Label htmlFor="hourlyRate">Hodinová sadzba €/h</Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    step="0.01"
                    min="0"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-muted-foreground">
                    Hodinová sadzba pre túto úlohu
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="budgetAmount">Rozpočet €</Label>
              <Input
                id="budgetAmount"
                type="number"
                step="0.01"
                min="0"
                value={budgetAmount}
                onChange={(e) => {
                  setBudgetAmount(e.target.value);
                  setIsBudgetAutoCalculated(false); // Manual entry, not auto-calculated
                }}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">
                {isBudgetAutoCalculated ? "Automaticky vypočítané z odhadu hodín" : "Nechajte prázdne pre kalkuláciu z hodín"}
              </p>
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

