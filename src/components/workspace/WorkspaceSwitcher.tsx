"use client";

import { useState } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function WorkspaceSwitcher() {
  const { workspace, workspaces, loading, switchWorkspace } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
        <Building2 className="h-4 w-4" />
        <span>Načítavam...</span>
      </div>
    );
  }

  if (!workspace || workspaces.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
        <Building2 className="h-4 w-4" />
        <span>Žiadny workspace</span>
      </div>
    );
  }

  const handleWorkspaceSwitch = async (workspaceId: string) => {
    await switchWorkspace(workspaceId);
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          aria-label={`Prepnúť workspace: ${workspace.name}`}
          className="flex h-9 items-center gap-2 rounded-lg px-1.5 sm:px-2"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
          </div>

          {/* Workspace name and plan */}
          <div className="hidden flex-col items-start sm:flex">
            <span className="max-w-36 truncate text-xs font-medium leading-4 text-foreground">
              {workspace.name}
            </span>
            <span className="text-[10px] leading-3 text-muted-foreground">
              {workspace.role === "owner" ? "Vlastník" : "Člen"}
            </span>
          </div>

          <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 p-2">
        <div className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">
          Prepnúť workspace
        </div>
        <div className="space-y-1">
          {workspaces.map((ws) => (
            <DropdownMenuItem
              key={ws.id}
              className="flex cursor-pointer items-center gap-3 rounded-md p-2.5 transition-colors"
              onClick={() => handleWorkspaceSwitch(ws.id)}
            >
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md border",
                  ws.id === workspace.id ? "border-input bg-accent" : "border-border bg-card"
                )}
              >
                <Building2
                  className={cn(
                    "h-4 w-4",
                    ws.id === workspace.id ? "text-foreground" : "text-muted-foreground"
                  )}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate text-foreground">{ws.name}</div>
                <div className="text-xs text-muted-foreground">
                  {ws.role === "owner" ? "Vlastník" : "Člen"}
                </div>
              </div>
              {ws.id === workspace.id && <div className="h-1.5 w-1.5 rounded-full bg-brand" />}
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
