"use client";

import { useEffect, useState } from "react";
import { Bell, Check, X } from "lucide-react";
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

export const TopNav = ({
  onMenuClick,
  onToggleSidebar,
  isSidebarCollapsed = false,
}: TopNavProps) => {
  const [invitations, setInvitations] = useState<WorkspaceInvitationNotification[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(true);
  const [processingInvitationId, setProcessingInvitationId] = useState<string | null>(null);

  const pendingCount = invitations.length;

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

  useEffect(() => {
    fetchInvitations();
    const interval = setInterval(fetchInvitations, 30000);
    return () => clearInterval(interval);
  }, []);

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
    <header className="sticky top-0 z-50 w-full bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm border-b border-slate-200/60 dark:border-slate-800/60">
      <div className="w-full px-8 h-16 flex items-center justify-between">
        {/* Left side - Search bar */}
        <div className="flex-1 max-w-md">
          <SearchBar />
        </div>

        {/* Right side - Actions and user menu */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Global timer (shows only when a timer is active) */}
          <GlobalTimer />

          {/* Notification bell */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-9 w-9 rounded-full hover:bg-accent"
                aria-label="Upozornenia"
              >
                <Bell className="h-4 w-4" />
                {pendingCount > 0 && (
                  <span className="absolute top-2 right-2 h-1.5 w-1.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-950" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[420px] p-0">
              <DropdownMenuLabel className="flex items-center justify-between px-4 py-3">
                <span>Upozornenia</span>
                <span className="text-xs font-medium text-muted-foreground">
                  {pendingCount} čakajúcich
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-[420px] overflow-y-auto p-3 space-y-3">
                {loadingInvitations && (
                  <p className="text-sm text-muted-foreground px-1 py-2">
                    Načítavam upozornenia...
                  </p>
                )}

                {!loadingInvitations && invitations.length === 0 && (
                  <p className="text-sm text-muted-foreground px-1 py-2">
                    Nemáte žiadne nové pozvánky.
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
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-4" />

          {/* Workspace Switcher */}
          <WorkspaceSwitcher />
        </div>
      </div>
    </header>
  );
};
