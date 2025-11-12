"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Loader2, 
  AlertCircle, 
  FileText, 
  Calendar, 
  Flag, 
  Clock,
  CheckSquare,
  MessageSquare,
  Link as LinkIcon,
  File,
  Download,
  ExternalLink,
  CheckCircle2,
  Circle,
  Activity,
  TrendingUp,
  Check,
  Image as ImageIcon,
  FileSpreadsheet,
  ZoomIn,
  Upload,
  Play,
  Eye,
  Send,
  XCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Flame
} from "lucide-react";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { getAppVersion } from "@/lib/version";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  position: number;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: {
    displayName: string | null;
    email: string;
  } | null;
}

interface DriveLink {
  id: string;
  url: string;
  description: string | null;
  created_at: string;
}

interface TaskFile {
  name: string;
  url: string | null;
  size: number;
  type: string;
  createdAt: string;
}

interface SharedTask {
  id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'review' | 'sent_to_client' | 'done' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  estimatedHours: number | null;
  checklist: ChecklistItem[];
  comments: Comment[];
  links: DriveLink[];
  files: TaskFile[];
}

const statusOptions = [
  { 
    value: "todo", 
    label: "To Do", 
    icon: Circle,
    color: "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200",
    iconColor: "text-slate-500"
  },
  { 
    value: "in_progress", 
    label: "In Progress", 
    icon: Play,
    color: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200",
    iconColor: "text-blue-500"
  },
  { 
    value: "review", 
    label: "Review", 
    icon: Eye,
    color: "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200",
    iconColor: "text-amber-500"
  },
  { 
    value: "sent_to_client", 
    label: "Sent to Client", 
    icon: Send,
    color: "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200",
    iconColor: "text-purple-500"
  },
  { 
    value: "done", 
    label: "Done", 
    icon: CheckCircle2,
    color: "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200",
    iconColor: "text-emerald-500"
  },
  { 
    value: "cancelled", 
    label: "Cancelled", 
    icon: XCircle,
    color: "bg-red-100 text-red-700 border-red-200 hover:bg-red-200",
    iconColor: "text-red-500"
  },
];

const priorityOptions = [
  { 
    value: "low", 
    label: "Low", 
    icon: ArrowDown,
    color: "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200",
    iconColor: "text-emerald-500"
  },
  { 
    value: "medium", 
    label: "Medium", 
    icon: ArrowUp,
    color: "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200",
    iconColor: "text-amber-500"
  },
  { 
    value: "high", 
    label: "High", 
    icon: ArrowUpRight,
    color: "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200",
    iconColor: "text-orange-500"
  },
  { 
    value: "urgent", 
    label: "Urgent", 
    icon: Flame,
    color: "bg-red-100 text-red-700 border-red-200 hover:bg-red-200",
    iconColor: "text-red-500"
  },
];

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const getFileIcon = (type: string, url?: string | null) => {
  if (type.startsWith("image/")) {
    return (
      <div 
        className="relative w-20 h-20 rounded-lg overflow-hidden bg-muted flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity group border border-border"
        onClick={() => url && window.open(url, '_blank')}
        title="Kliknite pre zobrazenie v plnej veľkosti"
      >
        {url ? (
          <>
            <img 
              src={url} 
              alt="Preview" 
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <ImageIcon className="h-10 w-10 hidden text-muted-foreground" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </>
        ) : (
          <ImageIcon className="h-10 w-10 text-muted-foreground" />
        )}
      </div>
    );
  } else if (type.includes("spreadsheet") || type.includes("excel")) {
    return (
      <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center border border-border">
        <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
      </div>
    );
  } else if (type.includes("pdf")) {
    return (
      <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center border border-border">
        <FileText className="h-10 w-10 text-muted-foreground" />
      </div>
    );
  } else {
    return (
      <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center border border-border">
        <File className="h-10 w-10 text-muted-foreground" />
      </div>
    );
  }
};

export default function SharedTaskPage() {
  const params = useParams();
  const shareToken = Array.isArray(params.shareToken) ? params.shareToken[0] : params.shareToken;
  const [task, setTask] = useState<SharedTask | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rightSidebarTab, setRightSidebarTab] = useState("comments");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [togglingItems, setTogglingItems] = useState<Set<string>>(new Set());
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  const fetchTask = useCallback(async (silent = false) => {
    if (!shareToken) return;
    
    try {
      // Add timestamp to prevent browser caching
      const timestamp = Date.now();
      console.log(`[FetchTask] Fetching task data for shareToken: ${shareToken} at ${new Date().toISOString()}`);
      
      const response = await fetch(`/api/share/tasks/${shareToken}?t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
        credentials: 'omit', // Don't send cookies for public access
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log(`[FetchTask] Received data:`, {
        success: result.success,
        hasData: !!result.data,
        taskId: result.data?.id,
        title: result.data?.title,
        updatedAt: result.data?.updatedAt,
      });

      if (result.success && result.data) {
        // Always update with fresh data from server
        console.log(`[FetchTask] Updating task state with fresh data`);
        setTask(result.data);
        // Set default tab based on available content
        if (result.data.comments.length === 0 && result.data.links.length > 0) {
          setRightSidebarTab("links");
        }
      } else {
        console.error(`[FetchTask] Failed to fetch task:`, result.error);
        if (!silent) {
          setError(result.error || "Úloha nebola nájdená");
        }
      }
    } catch (err) {
      console.error("[FetchTask] Error fetching shared task:", err);
      if (!silent) {
        setError("Nepodarilo sa načítať úlohu");
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, [shareToken]);
  
  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setIsAnonymous(!user);
      } catch (err) {
        console.error("Error checking auth:", err);
        setIsAnonymous(true);
      }
    };
    checkAuth();
  }, [supabase]);

  useEffect(() => {
    if (shareToken) {
      fetchTask();
    }
  }, [shareToken]);

  // Setup realtime subscriptions only for authenticated users
  // Anonymous users cannot use realtime (WebSocket requires auth), so they use polling only
  useEffect(() => {
    if (!task || !shareToken) return;
    
    // Skip realtime subscriptions for anonymous users - they don't work without auth
    if (isAnonymous) {
      console.log(`[Realtime] Skipping subscriptions for anonymous user - using polling only`);
      return;
    }

    const taskId = task.id;
    console.log(`[Realtime] Setting up subscription for task ${taskId} with token ${shareToken} (authenticated user)`);
    
    const channel = supabase
      .channel(`shared-task-${shareToken}`)
      .on("presence", { event: "sync" }, () => {
        // Handle presence sync if needed
      })
      // Subscribe to task updates
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tasks",
          filter: `id=eq.${taskId}`,
        },
        (payload) => {
          console.log(`[Realtime] Task UPDATE received:`, payload);
          console.log(`[Realtime] Payload new:`, payload.new);
          console.log(`[Realtime] Payload old:`, payload.old);
          
          // Always refetch full task data via API to ensure we have latest information
          console.log(`[Realtime] Triggering fetchTask to refresh all data...`);
          fetchTask(true);
        }
      )
      // Subscribe to checklist updates
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "task_checklist_items",
          filter: `task_id=eq.${taskId}`,
        },
        async (payload) => {
          console.log(`[Realtime] Checklist UPDATE received:`, payload);
          // Refetch full task data via API to ensure we have latest checklist items
          console.log(`[Realtime] Triggering fetchTask to refresh checklist...`);
          fetchTask(true);
        }
      )
      // Subscribe to comment updates
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "task_comments",
          filter: `task_id=eq.${taskId}`,
        },
        async (payload) => {
          console.log(`[Realtime] Comment UPDATE received:`, payload);
          // Refetch full task data via API to ensure we have latest comments
          console.log(`[Realtime] Triggering fetchTask to refresh comments...`);
          fetchTask(true);
        }
      )
      // Subscribe to Google Drive links updates
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "google_drive_links",
          filter: `task_id=eq.${taskId}`,
        },
        async (payload) => {
          console.log(`[Realtime] Drive links UPDATE received:`, payload);
          // Refetch full task data via API to ensure we have latest links
          console.log(`[Realtime] Triggering fetchTask to refresh links...`);
          fetchTask(true);
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime] Subscription status:`, status, `(anonymous: ${isAnonymous})`);
        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] Successfully subscribed to channel shared-task-${shareToken}`);
          setRealtimeConnected(true);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`[Realtime] Channel error for shared-task-${shareToken} - will use polling fallback`);
          setRealtimeConnected(false);
        } else if (status === 'TIMED_OUT') {
          console.error(`[Realtime] Subscription timed out for shared-task-${shareToken} - will use polling fallback`);
          setRealtimeConnected(false);
        } else if (status === 'CLOSED') {
          console.log(`[Realtime] Channel closed for shared-task-${shareToken}`);
          setRealtimeConnected(false);
        }
      });

    return () => {
      console.log(`[Realtime] Cleaning up subscription for task ${taskId}`);
      supabase.removeChannel(channel);
    };
  }, [task?.id, shareToken, supabase, isAnonymous, fetchTask]); // Include fetchTask in dependencies

  // Auto-refresh: Polling for all users
  // For anonymous users: poll every 2 seconds (realtime doesn't work)
  // For authenticated users: poll every 5 seconds as fallback if realtime fails
  useEffect(() => {
    if (!shareToken) return;
    
    // Anonymous users need more frequent polling since realtime doesn't work
    // Authenticated users can rely on realtime, so polling is just a fallback
    const pollInterval = isAnonymous ? 2000 : 5000;
    
    const interval = setInterval(() => {
      console.log(`[Polling] Refreshing task data... (anonymous: ${isAnonymous})`);
      fetchTask(true);
    }, pollInterval);

    return () => {
      clearInterval(interval);
    };
  }, [shareToken, fetchTask, isAnonymous]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Načítavam úlohu...</p>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <div>
                <h2 className="text-lg font-semibold mb-2">Úloha nebola nájdená</h2>
                <p className="text-muted-foreground">
                  {error || "Tento odkaz nie je platný alebo úloha už nie je zdieľateľná."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completedCount = task.checklist.filter(item => item.completed).length;
  const totalCount = task.checklist.length;
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Toggle checklist item
  const handleToggleItem = async (itemId: string, completed: boolean) => {
    if (!shareToken) return;
    
    setTogglingItems(prev => new Set(prev).add(itemId));
    
    try {
      const response = await fetch(`/api/share/tasks/${shareToken}/checklist/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ completed }),
      });

      const result = await response.json();

      if (result.success) {
        // Update local state
        setTask(prev => {
          if (!prev) return null;
          return {
            ...prev,
            checklist: prev.checklist.map(item =>
              item.id === itemId ? { ...item, completed } : item
            )
          };
        });
      } else {
        console.error('Failed to update checklist item:', result.error);
      }
    } catch (error) {
      console.error('Error toggling checklist item:', error);
    } finally {
      setTogglingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F8F8]">
      <div className="w-full px-6 py-6">
        <div className="space-y-4">
          {/* Header with Logo */}
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 flex items-center">
              <Image
                src="/images/layers-logo.svg"
                alt="Layers Logo"
                width={120}
                height={40}
                className="object-contain"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">v{getAppVersion()}</span>
            </div>
          </div>

          {/* Compact Task Header */}
          <Card className="bg-card border border-border shadow-sm">
            <CardContent className="p-4">
              <div className="space-y-4">
                {/* Title */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h1 className="text-2xl font-bold text-foreground truncate mb-2">{task.title}</h1>
                  </div>
                </div>

                {/* All Metadata in One Row */}
                <div className="pt-4 border-t border-border">
                  <div className="flex flex-wrap items-start gap-6">
                    {/* Status */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Activity className="h-4 w-4" />
                        Status
                      </div>
                      {(() => {
                        const currentStatus = statusOptions.find(option => option.value === task.status) || statusOptions[0];
                        const IconComponent = currentStatus.icon;
                        return (
                          <div className={cn(
                            "flex items-center rounded-md border transition-all duration-200",
                            "gap-2 px-3 py-2 h-[2.5rem] text-sm",
                            "font-medium whitespace-nowrap",
                            currentStatus.color,
                            "cursor-default"
                          )}>
                            <IconComponent className={cn(
                              "flex-shrink-0 h-4 w-4",
                              currentStatus.iconColor,
                              task.status === "in_progress" && "animate-pulse"
                            )} />
                            <span className="whitespace-nowrap">{currentStatus.label}</span>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Priority */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <TrendingUp className="h-4 w-4" />
                        Priorita
                      </div>
                      {(() => {
                        const currentPriority = priorityOptions.find(option => option.value === task.priority) || priorityOptions[0];
                        const IconComponent = currentPriority.icon;
                        return (
                          <div className={cn(
                            "flex items-center rounded-md border transition-all duration-200",
                            "gap-2 px-3 py-2 h-[2.5rem] text-sm",
                            "font-medium whitespace-nowrap",
                            currentPriority.color,
                            "cursor-default"
                          )}>
                            <IconComponent className={cn(
                              "flex-shrink-0 h-4 w-4",
                              currentPriority.iconColor,
                              task.priority === "urgent" && "animate-pulse"
                            )} />
                            <span className="whitespace-nowrap">{currentPriority.label}</span>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Date Range (Start Date - Deadline) */}
                    {task.dueDate && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          Dátum
                        </div>
                        <div
                          className={cn(
                            "flex items-center gap-2 bg-muted rounded-md px-3 py-2 h-[2.5rem] transition-colors border border-border",
                            "cursor-default"
                          )}
                        >
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground flex-1">
                            {format(new Date(task.dueDate), "dd.MM.yyyy", { locale: sk })}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Estimated Hours */}
                    {task.estimatedHours && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          Odhadované hodiny
                        </div>
                        <div className="text-sm font-medium">{task.estimatedHours}h</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Content */}
          <div className="flex flex-col xl:flex-row gap-4">
            {/* Left Column - Main Content */}
            <div className="flex-1 space-y-4">
              {/* Description */}
              <Card className="bg-card border border-border shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Popis úlohy
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {task.description ? (
                    <div 
                      className="prose prose-sm max-w-none text-foreground"
                      style={{
                        padding: '0.75rem',
                        minHeight: '150px',
                      }}
                    >
                      <div 
                        dangerouslySetInnerHTML={{ __html: task.description }}
                        style={{
                          outline: 'none',
                        }}
                        className="[&_p]:my-2 [&_ul]:pl-6 [&_ol]:pl-6 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-1 [&_li_p]:my-0 [&_li_p]:inline [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono [&_pre]:bg-muted [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_blockquote]:border-l-4 [&_blockquote]:border-l-primary [&_blockquote]:pl-4 [&_blockquote]:my-4 [&_blockquote]:text-muted-foreground [&_blockquote]:bg-muted/30 [&_blockquote]:py-3 [&_blockquote]:px-4 [&_blockquote]:rounded-r-lg [&_a]:text-primary [&_a]:underline [&_a:hover]:text-primary/80 [&_strong]:font-semibold [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:my-3 [&_h1]:my-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:my-3 [&_h2]:my-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:my-2 [&_h4]:text-base [&_h4]:font-semibold [&_h4]:my-2 [&_h5]:text-sm [&_h5]:font-semibold [&_h5]:my-2 [&_h6]:text-xs [&_h6]:font-semibold [&_h6]:my-2"
                      />
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic p-3">Žiadny popis</p>
                  )}
                </CardContent>
              </Card>

              {/* Task Checklist */}
              {task.checklist.length > 0 && (
                <Card className="bg-card border border-border shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        Checklist úlohy
                      </CardTitle>
                      {totalCount > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="text-xs text-muted-foreground">
                            {completedCount}/{totalCount}
                          </div>
                          <div className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            {progressPercentage}%
                          </div>
                        </div>
                      )}
                    </div>
                    {totalCount > 0 && (
                      <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                        <div 
                          className="bg-primary h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-1.5">
                      {task.checklist.map((item) => {
                        const isToggling = togglingItems.has(item.id);
                        return (
                          <div
                            key={item.id}
                            className={cn(
                              "flex items-center gap-2 p-2 rounded-md transition-colors",
                              isToggling ? "opacity-50 cursor-wait" : "hover:bg-muted/50 cursor-pointer"
                            )}
                            onClick={() => !isToggling && handleToggleItem(item.id, !item.completed)}
                          >
                            {isToggling ? (
                              <Loader2 className="h-5 w-5 text-muted-foreground flex-shrink-0 animate-spin" />
                            ) : item.completed ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                            ) : (
                              <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            )}
                            <span className={cn(
                              "text-sm flex-1",
                              item.completed && "line-through text-muted-foreground"
                            )}>
                              {item.text}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Task Files */}
              {task.files.length > 0 && (
                <Card className="bg-card border border-border shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                      <File className="h-4 w-4" />
                      Súbory
                      {task.files.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {task.files.length}
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {task.files.map((file, index) => (
                        <div
                          key={index}
                          className="aspect-square bg-muted/30 rounded-lg border border-border hover:bg-muted/50 transition-all duration-500 overflow-hidden relative group"
                        >
                          {file.type.startsWith("image/") ? (
                            <>
                              <div 
                                className="w-full h-full cursor-pointer relative"
                                onClick={() => file.url && setSelectedImage(file.url)}
                                title="Kliknite pre zobrazenie v plnej veľkosti"
                              >
                                {file.url ? (
                                  <>
                                    <img 
                                      src={file.url} 
                                      alt="Preview" 
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                      }}
                                    />
                                    <div className="absolute inset-0 bg-muted flex items-center justify-center hidden">
                                      <ImageIcon className="h-12 w-12 text-muted-foreground" />
                                    </div>
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                      <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                  </>
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-muted">
                                    <ImageIcon className="h-12 w-12 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                              
                              {/* File info overlay at bottom */}
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                <p className="text-xs text-white font-medium truncate">{file.name}</p>
                                <p className="text-xs text-white/70">{formatFileSize(file.size)}</p>
                              </div>
                            </>
                          ) : (
                            <>
                              {getFileIcon(file.type, file.url)}
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                <p className="text-xs text-white font-medium truncate">{file.name}</p>
                                <p className="text-xs text-white/70">{formatFileSize(file.size)}</p>
                              </div>
                              {file.url && (
                                <a
                                  href={file.url}
                                  download
                                  className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 rounded-full p-1.5 transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Download className="h-3 w-3 text-white" />
                                </a>
                              )}
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Sidebar */}
            {(task.comments.length > 0 || task.links.length > 0) && (
              <div className="w-full xl:w-80 space-y-4 order-first xl:order-last">
                <Tabs value={rightSidebarTab} onValueChange={setRightSidebarTab} className="w-full">
                  <TabsList className="inline-flex h-9 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
                    {task.comments.length > 0 && (
                      <TabsTrigger 
                        value="comments" 
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Komentáre</span>
                        <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1.5 text-xs">
                          {task.comments.length}
                        </Badge>
                      </TabsTrigger>
                    )}
                    {task.links.length > 0 && (
                      <TabsTrigger 
                        value="links" 
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                      >
                        <LinkIcon className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Linky</span>
                        <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1.5 text-xs">
                          {task.links.length}
                        </Badge>
                      </TabsTrigger>
                    )}
                  </TabsList>

                  {/* Comments Tab */}
                  {task.comments.length > 0 && (
                    <TabsContent value="comments" className="mt-4">
                      <Card className="bg-card border border-border shadow-sm">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            Komentáre
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="space-y-3 max-h-[350px] overflow-y-auto">
                            {task.comments.map((comment) => (
                              <div key={comment.id} className="flex gap-2 p-3 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                                <Avatar className="h-7 w-7 flex-shrink-0">
                                  <AvatarFallback className="text-xs">
                                    {(comment.user?.displayName || comment.user?.email || "U").charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 space-y-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      <span className="font-medium text-xs truncate">
                                        {comment.user?.displayName || comment.user?.email || "User"}
                                      </span>
                                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        {format(new Date(comment.createdAt), "d.M. HH:mm", { locale: sk })}
                                      </span>
                                    </div>
                                  </div>
                                  <div 
                                    className="text-xs prose prose-xs max-w-none break-words"
                                    dangerouslySetInnerHTML={{ __html: comment.content }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  )}

                  {/* Links Tab */}
                  {task.links.length > 0 && (
                    <TabsContent value="links" className="mt-4">
                      <Card className="bg-card border border-border shadow-sm">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                            <LinkIcon className="h-4 w-4" />
                            Google Drive
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="space-y-3">
                            {task.links.map((link) => (
                              <div key={link.id} className="flex items-center justify-between rounded-md bg-muted/50 p-3 border border-border">
                                <div className="flex-1 min-w-0">
                                  <a
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-sm font-medium text-primary hover:underline truncate"
                                  >
                                    <LinkIcon className="h-4 w-4 flex-shrink-0 text-blue-600" />
                                    <span className="truncate text-foreground">{link.description || "Link"}</span>
                                    <ExternalLink className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                                  </a>
                                  <p className="text-xs text-muted-foreground mt-1 truncate">{link.url}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  )}
                </Tabs>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <img 
            src={selectedImage} 
            alt="Full size" 
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
