"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, CheckCheck, Menu, MessageSquare, CalendarClock, Activity, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { sk } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { GlobalTimer } from "@/components/timer/GlobalTimer";
import { WorkspaceSwitcher } from "@/components/workspace/WorkspaceSwitcher";
import { SearchBar } from "@/components/ui/search-bar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";

interface TopNavProps {
  onMenuClick: () => void;
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
}

interface WorkspaceInvitationNotification {
  id: string;
  role: string;
  workspace: {
    id: string;
    name: string;
    description: string | null;
  };
  project_ids?: string[];
  project_names?: string[];
}

interface AppNotification {
  id: string;
  type: "status_change" | "comment" | "due_date" | string;
  title: string;
  body: string | null;
  task_id: string | null;
  project_id: string | null;
  read_at: string | null;
  created_at: string;
}

const notificationIcon = (type: string) => {
  switch (type) {
    case "comment":
      return MessageSquare;
    case "due_date":
      return CalendarClock;
    default:
      return Activity;
  }
};

export const TopNav = ({
  onMenuClick,
  onToggleSidebar,
  isSidebarCollapsed = false,
}: TopNavProps) => {
  const router = useRouter();
  const [invitations, setInvitations] = useState<WorkspaceInvitationNotification[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(true);
  const [processingInvitationId, setProcessingInvitationId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const pendingCount = invitations.length + unreadCount;

  const fetchInvitations = async () => {
    try {
      const response = await fetch("/api/workspace-invitations", { cache: "no-store" });
      const result = await response.json();

      if (response.ok && result?.success) {
        setInvitations(result.data || []);
      } else {
        setInvitations([]);
      }
    } catch (error) {
      setInvitations([]);
    } finally {
      setLoadingInvitations(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      const result = await response.json();
      if (response.ok && result?.success) {
        setNotifications(result.data || []);
        setUnreadCount(result.unreadCount || 0);
      }
    } catch (error) {
      // silent — bell just stays as-is
    }
  };

  useEffect(() => {
    fetchInvitations();
    fetchNotifications();
    const interval = setInterval(() => {
      fetchInvitations();
      fetchNotifications();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleNotificationClick = async (notification: AppNotification) => {
    if (!notification.read_at) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: notification.id }),
      }).catch(() => {});
    }
    if (notification.task_id && notification.project_id) {
      router.push(`/projects/${notification.project_id}/tasks/${notification.task_id}`);
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) =>
      prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() }))
    );
    setUnreadCount(0);
    fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    }).catch(() => {});
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    setProcessingInvitationId(invitationId);
    try {
      const response = await fetch(`/api/workspace-invitations/${invitationId}/accept`, {
        method: "POST",
      });
      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || "Nepodarilo sa prijať pozvánku");
      }

      toast({
        title: "Pozvánka prijatá",
        description: "Workspace bol pridaný medzi vaše pracovné priestory.",
      });

      await fetchInvitations();
      window.location.reload();
    } catch (error) {
      toast({
        title: "Chyba",
        description: error instanceof Error ? error.message : "Nepodarilo sa prijať pozvánku",
        variant: "destructive",
      });
    } finally {
      setProcessingInvitationId(null);
    }
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    setProcessingInvitationId(invitationId);
    try {
      const response = await fetch(`/api/workspace-invitations/${invitationId}/decline`, {
        method: "POST",
      });
      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || "Nepodarilo sa odmietnuť pozvánku");
      }

      toast({
        title: "Pozvánka odmietnutá",
        description: "Pozvánka bola odstránená z upozornení.",
      });

      await fetchInvitations();
    } catch (error) {
      toast({
        title: "Chyba",
        description: error instanceof Error ? error.message : "Nepodarilo sa odmietnuť pozvánku",
        variant: "destructive",
      });
    } finally {
      setProcessingInvitationId(null);
    }
  };

  const invitationSubtitle = (invitation: WorkspaceInvitationNotification) => {
    const projectNames = invitation.project_names || [];
    const projectIds = invitation.project_ids || [];

    if (projectNames.length > 0) {
      return `Prístup iba do projektov: ${projectNames.join(", ")}`;
    }

    if (projectIds.length > 0) {
      return "Prístup iba do vybraných projektov";
    }

    return "Prístup do celého workspace";
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border/80 bg-background/85 backdrop-blur-xl">
      <div className="flex h-[52px] w-full items-center gap-2 px-3 sm:px-4 lg:px-5">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="h-8 w-8 shrink-0 md:hidden"
          aria-label="Otvoriť navigáciu"
        >
          <Menu className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="hidden h-8 w-8 shrink-0 text-muted-foreground md:inline-flex"
          aria-label={isSidebarCollapsed ? "Rozbaliť navigáciu" : "Zbaliť navigáciu"}
        >
          {isSidebarCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
        {/* Left side - Search bar */}
        <div className="min-w-0 flex-1 max-w-md">
          <SearchBar />
        </div>

        {/* Right side - Actions and user menu */}
        <div className="ml-auto flex flex-shrink-0 items-center gap-1.5">
          {/* Global timer (shows only when a timer is active) */}
          <GlobalTimer />

          {/* Notification bell */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-8 w-8 rounded-md text-muted-foreground"
                aria-label="Upozornenia"
              >
                <Bell className="h-4 w-4" />
                {pendingCount > 0 && (
                  <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-destructive" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[420px] p-0">
              <DropdownMenuLabel className="flex items-center justify-between px-4 py-3">
                <span>Upozornenia</span>
                {unreadCount > 0 ? (
                  <button
                    onClick={handleMarkAllRead}
                    className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Označiť ako prečítané
                  </button>
                ) : (
                  <span className="text-xs font-medium text-muted-foreground">
                    {pendingCount} čakajúcich
                  </span>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-[420px] overflow-y-auto p-3 space-y-3">
                {loadingInvitations && (
                  <p className="text-sm text-muted-foreground px-1 py-2">
                    Načítavam upozornenia...
                  </p>
                )}

                {/* Task notifications */}
                {notifications.length > 0 && (
                  <div className="space-y-1">
                    {notifications.map((notification) => {
                      const Icon = notificationIcon(notification.type);
                      const isUnread = !notification.read_at;
                      return (
                        <button
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={cn(
                            "flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-muted",
                            isUnread && "bg-brand/[0.04]"
                          )}
                        >
                          <span
                            className={cn(
                              "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                              isUnread ? "bg-brand/10 text-brand" : "bg-muted text-muted-foreground"
                            )}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          <span className="min-w-0 flex-1 space-y-0.5">
                            <span className={cn(
                              "block text-[13px] leading-snug",
                              isUnread ? "font-medium text-foreground" : "text-muted-foreground"
                            )}>
                              {notification.title}
                            </span>
                            {notification.body && (
                              <span className="block truncate text-xs text-muted-foreground">
                                {notification.body}
                              </span>
                            )}
                            <span className="block text-[11px] text-muted-foreground/60">
                              {formatDistanceToNow(new Date(notification.created_at), {
                                addSuffix: true,
                                locale: sk,
                              })}
                            </span>
                          </span>
                          {isUnread && (
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {!loadingInvitations && invitations.length === 0 && notifications.length === 0 && (
                  <p className="text-sm text-muted-foreground px-1 py-2">
                    Nemáte žiadne nové upozornenia.
                  </p>
                )}

                {!loadingInvitations &&
                  invitations.map((invitation) => {
                    const isProcessing = processingInvitationId === invitation.id;
                    return (
                      <div
                        key={invitation.id}
                        className="rounded-lg border border-border p-3 space-y-3"
                      >
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-foreground">
                            Pozvánka do workspace {invitation.workspace?.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {invitationSubtitle(invitation)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleAcceptInvitation(invitation.id)}
                            disabled={isProcessing}
                            className="h-8"
                          >
                            <Check className="h-3.5 w-3.5 mr-1" />
                            Prijať
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeclineInvitation(invitation.id)}
                            disabled={isProcessing}
                            className="h-8"
                          >
                            <X className="h-3.5 w-3.5 mr-1" />
                            Odmietnuť
                          </Button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Separator */}
          <div className="mx-1 hidden h-5 w-px bg-border sm:block" />

          {/* Workspace Switcher */}
          <WorkspaceSwitcher />
        </div>
      </div>
    </header>
  );
};
