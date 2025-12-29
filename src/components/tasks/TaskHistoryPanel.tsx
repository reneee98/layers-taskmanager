"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquare, CheckCircle, FileText, Wallet, User } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { sk } from "date-fns/locale";
import { formatCurrency } from "@/lib/format";
import { getTaskStatusLabel } from "@/lib/task-status";

interface TaskHistoryPanelProps {
  taskId: string;
}

interface HistoryItem {
  id: string;
  type: 'comment' | 'status_change' | 'file_upload' | 'cost_added';
  user: {
    name: string;
    email?: string;
  };
  description: string;
  metadata?: {
    status?: string;
    fileName?: string;
    costName?: string;
    costAmount?: number;
  };
  created_at: string;
}

export function TaskHistoryPanel({ taskId }: TaskHistoryPanelProps) {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [taskId]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      // Fetch comments
      const commentsResponse = await fetch(`/api/tasks/${taskId}/comments`);
      const commentsResult = await commentsResponse.json();
      
      // Fetch cost items
      const taskResponse = await fetch(`/api/tasks/${taskId}`);
      const taskResult = await taskResponse.json();
      let costItems: any[] = [];
      if (taskResult.success && taskResult.data?.project_id) {
        const costResponse = await fetch(`/api/costs?project_id=${taskResult.data.project_id}&task_id=${taskId}`);
        const costResult = await costResponse.json();
        if (costResult.success) {
          costItems = costResult.data || [];
        }
      }

      // Fetch files
      const filesResponse = await fetch(`/api/tasks/${taskId}/files`);
      const filesResult = await filesResponse.json();

      // Fetch activities for status changes
      const activitiesResponse = await fetch(`/api/tasks/${taskId}/activities`);
      const activitiesResult = activitiesResponse.ok ? await activitiesResponse.json() : { success: false, data: [] };

      // Combine all items into history
      const items: HistoryItem[] = [];

      // Add comments
      if (commentsResult.success && commentsResult.data) {
        commentsResult.data.forEach((comment: any) => {
          items.push({
            id: `comment-${comment.id}`,
            type: 'comment',
            user: {
              name: comment.user?.name || comment.user?.display_name || 'Neznámy',
              email: comment.user?.email,
            },
            description: comment.content || '',
            created_at: comment.created_at,
          });
        });
      }

      // Add status changes from activities
      if (activitiesResult.success && activitiesResult.data) {
        activitiesResult.data
          .filter((activity: any) => activity.type === 'task_status_changed')
          .forEach((activity: any) => {
            items.push({
              id: `activity-${activity.id}`,
              type: 'status_change',
              user: {
                name: activity.user?.display_name || activity.user?.name || 'Systém',
                email: activity.user?.email,
              },
              description: 'zmenil status na',
              metadata: {
                status: getTaskStatusLabel(activity.metadata?.new_status || activity.action?.split(' na ')[1] || ''),
              },
              created_at: activity.created_at,
            });
          });
      }

      // Add cost items
      costItems.forEach((cost: any) => {
        items.push({
          id: `cost-${cost.id}`,
          type: 'cost_added',
          user: {
            name: cost.created_by_user?.name || cost.created_by_user?.display_name || 'Systém',
            email: cost.created_by_user?.email,
          },
          description: 'zaevidoval externý náklad',
          metadata: {
            costName: cost.name,
            costAmount: cost.amount,
          },
          created_at: cost.created_at,
        });
      });

      // Add file uploads
      if (filesResult.success && filesResult.data) {
        filesResult.data.forEach((file: any) => {
          items.push({
            id: `file-${file.name}-${file.createdAt}`,
            type: 'file_upload',
            user: {
              name: file.uploaded_by_user?.name || file.uploaded_by_user?.display_name || 'Systém',
              email: file.uploaded_by_user?.email,
            },
            description: 'nahral nové súbory',
            metadata: {
              fileName: file.name || file.file_name,
            },
            created_at: file.createdAt || file.created_at,
          });
        });
      }

      // Sort by date (newest first)
      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setHistoryItems(items);
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getHistoryIcon = (type: string) => {
    switch (type) {
      case 'comment':
        return <MessageSquare className="h-4 w-4 text-[#62748e] dark:text-muted-foreground" />;
      case 'status_change':
        return <CheckCircle className="h-4 w-4 text-[#62748e] dark:text-muted-foreground" />;
      case 'file_upload':
        return <FileText className="h-4 w-4 text-[#62748e] dark:text-muted-foreground" />;
      case 'cost_added':
        return <Wallet className="h-4 w-4 text-[#62748e] dark:text-muted-foreground" />;
      default:
        return <User className="h-4 w-4 text-[#62748e] dark:text-muted-foreground" />;
    }
  };

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return formatDistanceToNow(date, { addSuffix: true, locale: sk });
    } else if (diffInHours < 48) {
      return `Včera, ${format(date, 'HH:mm')}`;
    } else {
      return format(date, "d. MMMM, HH:mm", { locale: sk });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="bg-white dark:bg-card border border-[#e2e8f0] dark:border-border rounded-[14px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
      <CardContent className="p-8">
        <div className="relative flex flex-col gap-10">
          {/* Vertical timeline line */}
          {historyItems.length > 0 && (
            <div className="absolute left-[20px] top-0 bottom-0 w-[1px] bg-[#e2e8f0] dark:bg-border" />
          )}
          
          {historyItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Žiadna história
            </div>
          ) : (
            historyItems.map((item, index) => (
              <div key={item.id} className="relative flex gap-4 items-start">
                {/* Icon */}
                <div className="relative bg-white dark:bg-card border border-[#e2e8f0] dark:border-border rounded-full size-10 flex items-center justify-center shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] shrink-0 z-10">
                  {getHistoryIcon(item.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 flex flex-col gap-2 pt-2">
                  {/* Header with name, description, and timestamp */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold leading-[20px] text-[#0f172b] dark:text-foreground text-[14px] tracking-[-0.1504px]">
                        {item.user.name}
                      </p>
                      <p className="font-normal leading-[16px] text-[#62748e] dark:text-muted-foreground text-[12px]">
                        {item.description}
                      </p>
                    </div>
                    <div className="bg-[#f8fafc] dark:bg-muted rounded-full h-6 px-2 flex items-center shrink-0">
                      <p className="font-normal leading-[16px] text-[#90a1b9] dark:text-muted-foreground text-[12px]">
                        {formatTimestamp(item.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* Metadata (status badge, file name, cost info) */}
                  {item.metadata && (
                    <div className="mt-1">
                      {item.metadata.status && (
                        <Badge className="bg-[#f8fafc] dark:bg-muted border border-[#e2e8f0] dark:border-border h-[30px] px-[13px] rounded-[10px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
                          <span className="font-medium text-[14px] text-[#314158] dark:text-foreground tracking-[-0.1504px]">
                            {item.metadata.status}
                          </span>
                        </Badge>
                      )}
                      {item.metadata.fileName && (
                        <Badge className="bg-[#f8fafc] dark:bg-muted border border-[#e2e8f0] dark:border-border h-[30px] px-[13px] rounded-[10px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
                          <span className="font-medium text-[14px] text-[#314158] dark:text-foreground tracking-[-0.1504px]">
                            {item.metadata.fileName}
                          </span>
                        </Badge>
                      )}
                      {item.metadata.costName && (
                        <Badge className="bg-[#f8fafc] dark:bg-muted border border-[#e2e8f0] dark:border-border h-[30px] px-2 rounded-[10px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
                          <span className="font-medium text-[14px] text-[#314158] dark:text-foreground tracking-[-0.1504px]">
                            {item.metadata.costName} {item.metadata.costAmount && `(${formatCurrency(item.metadata.costAmount)})`}
                          </span>
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

