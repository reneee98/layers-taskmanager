"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, Euro, BarChart3, MessageSquare, Paperclip, FileText } from "lucide-react";
import { TimePanel } from "@/components/time/TimePanel";
import { CostsPanel } from "@/components/costs/CostsPanel";
import { ProjectReport } from "@/components/report/ProjectReport";
import { CommentsList } from "@/components/comments/CommentsList";
import { FilesList } from "@/components/files/FilesList";
import { QuillEditor } from "@/components/ui/quill-editor";
import { toast } from "@/hooks/use-toast";
import { getTextPreview } from "@/lib/utils/html";
import { formatHours } from "@/lib/format";
import type { Task } from "@/types/database";

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [description, setDescription] = useState("");
  const [descriptionHtml, setDescriptionHtml] = useState("");
  const [isSaving, setIsSaving] = useState(false); // Loading state for auto-save
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchTask = async () => {
    try {
      const response = await fetch(`/api/tasks/${params.taskId}`);
      const result = await response.json();

      if (result.success) {
        setTask(result.data);
      } else {
        toast({
          title: "Chyba",
          description: "Úloha nebola nájdená",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa načítať úlohu",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTask();
  }, [params.taskId]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (task) {
      setDescription(task.description || "");
      setDescriptionHtml(task.description || "");
    }
  }, [task]);

  const handleDescriptionChange = (content: string, html: string) => {
    console.log("handleDescriptionChange called:", { content, html });
    setDescription(content);
    setDescriptionHtml(html); // Ukladáme HTML s obrázkami
    
    // Automatické ukladanie po 3 sekundách neaktivity (viac času pre obrázky)
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      console.log("Auto-save triggered after 3s");
      handleSaveDescription();
    }, 3000); // Zvýšené z 1000ms na 3000ms
  };

  const handleSaveDescription = async () => {
    if (!task || isSaving) return;

    // Kontrola, či sú obrázky načítané (ak sú v HTML)
    const hasImages = descriptionHtml.includes('<img');
    if (hasImages) {
      // Ak sú obrázky, počkáme ešte 2 sekundy
      console.log("Detected images, waiting additional 2s...");
      setTimeout(() => {
        handleSaveDescription();
      }, 2000);
      return;
    }

    console.log("handleSaveDescription called:", { descriptionHtml: descriptionHtml.trim() });
    setIsSaving(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: descriptionHtml.trim() || null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setTask(result.data);
        // Tichý úspech pre auto-save
        console.log("Popis úlohy bol automaticky uložený");
      } else {
        toast({
          title: "Chyba",
          description: "Nepodarilo sa uložiť popis úlohy",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa uložiť popis úlohy",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">Načítavam...</p>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">Úloha nebola nájdená</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "todo":
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
      case "in_progress":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "done":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "cancelled":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "high":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "medium":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "low":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/projects/${params.projectId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Späť na projekt
          </Button>
        </div>
      </div>

      {/* Task Info */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold">{task.title}</h1>
        </div>

        <div className="flex flex-wrap gap-3">
          <Badge className={getStatusColor(task.status)}>
            {task.status === "todo" && "Na urobiť"}
            {task.status === "in_progress" && "Prebieha"}
            {task.status === "done" && "Hotovo"}
            {task.status === "cancelled" && "Zrušené"}
          </Badge>
          
          <Badge className={getPriorityColor(task.priority)}>
            {task.priority === "urgent" && "🔥 Urgentné"}
            {task.priority === "high" && "Vysoká"}
            {task.priority === "medium" && "Stredná"}
            {task.priority === "low" && "Nízka"}
          </Badge>

          {task.estimated_hours && (
            <Badge variant="outline">
              <Clock className="h-3 w-3 mr-1" />
              Odhad: {formatHours(task.estimated_hours)}
            </Badge>
          )}

            {task.actual_hours && task.actual_hours > 0 && (
            <Badge variant="outline">
              <Clock className="h-3 w-3 mr-1" />
              Odpracované: {formatHours(task.actual_hours)}
            </Badge>
          )}

          {task.due_date && (
            <Badge variant="outline">
              📅 Deadline: {new Date(task.due_date).toLocaleDateString("sk-SK")}
            </Badge>
          )}

          {task.budget_amount && task.budget_amount > 0 && (
            <Badge variant="outline">
              💰 Rozpočet: {task.budget_amount.toFixed(2)} €
            </Badge>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full">
        <Tabs defaultValue="description" className="w-full">
          <TabsList>
            <TabsTrigger value="description">
              <FileText className="h-4 w-4 mr-2" />
              Popis úlohy
            </TabsTrigger>
            <TabsTrigger value="time">
              <Clock className="h-4 w-4 mr-2" />
              Čas
            </TabsTrigger>
            <TabsTrigger value="costs">
              <Euro className="h-4 w-4 mr-2" />
              Náklady
            </TabsTrigger>
            <TabsTrigger value="report">
              <BarChart3 className="h-4 w-4 mr-2" />
              Report
            </TabsTrigger>
          </TabsList>

          <TabsContent value="description" className="space-y-6">
            {/* Task Description */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Popis úlohy</h3>
                  {isSaving && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                      Ukladám...
                    </div>
                  )}
                </div>
              
                  <QuillEditor
                    content={description}
                    onChange={handleDescriptionChange}
                    placeholder="Napíšte popis úlohy..."
                    className="min-h-[150px]"
                    editable={true}
                    taskId={params.taskId}
                  />
            </div>

            {/* Comments Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Komentáre</h3>
              </div>
              <div className="border rounded-lg p-4">
                <CommentsList 
                  taskId={task.id}
                  onCommentAdded={() => {
                    // Optionally refresh task data or show notification
                  }}
                />
              </div>
            </div>

            {/* Files Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Paperclip className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Súbory</h3>
              </div>
              <div className="border rounded-lg p-4">
                <FilesList 
                  taskId={task.id}
                  onFileAdded={() => {
                    // Optionally refresh task data or show notification
                  }}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="time" className="space-y-4">
            <TimePanel 
              projectId={params.projectId as string} 
              tasks={[task]} 
              defaultTaskId={task.id}
              onTimeEntryAdded={() => {
                // Refresh task data to update actual_hours
                fetchTask();
                // Also refresh project summary by navigating back and forth
                // This is a simple way to trigger a refresh
                window.dispatchEvent(new CustomEvent('timeEntryAdded'));
              }}
            />
          </TabsContent>

          <TabsContent value="costs" className="space-y-4">
            <CostsPanel 
              projectId={params.projectId as string} 
              tasks={[task]}
              defaultTaskId={task.id}
              onCostAdded={() => {
                // Refresh task data if needed
                fetchTask();
              }}
            />
          </TabsContent>

          <TabsContent value="report" className="space-y-4">
            <ProjectReport 
              projectId={params.projectId as string}
              taskId={task.id}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

