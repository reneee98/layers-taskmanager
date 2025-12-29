"use client";

import { useState, useEffect } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Building2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
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
          className="flex items-center gap-3 px-2 py-0 h-10 hover:bg-transparent rounded-[10px] transition-colors"
        >
          {/* Purple gradient avatar */}
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm"
            style={{ backgroundImage: "linear-gradient(135deg, rgba(97, 95, 255, 1) 0%, rgba(152, 16, 250, 1) 100%)" }}
          >
            <Building2 className="h-3.5 w-3.5 text-white" />
          </div>
          
          {/* Workspace name and plan */}
          <div className="flex flex-col items-start gap-0.5">
            <span className="text-sm font-semibold leading-[14px] text-[#314158] dark:text-foreground tracking-[-0.15px]">
              {workspace.name}
            </span>
            <span className="text-[10px] font-medium leading-[12.5px] text-[#90a1b9] dark:text-muted-foreground tracking-[0.12px]">
              Enterprise
            </span>
          </div>
          
          <ChevronDown className="h-3.5 w-3.5 text-[#90a1b9] dark:text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 p-2">
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Prepnúť workspace
        </div>
        <div className="space-y-1">
          {workspaces.map((ws) => (
            <DropdownMenuItem 
              key={ws.id}
              className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-accent transition-colors"
              onClick={() => handleWorkspaceSwitch(ws.id)}
            >
                   <div className={cn(
                     "w-8 h-8 rounded-lg flex items-center justify-center",
                     ws.id === workspace.id 
                       ? "bg-gray-900" 
                       : "bg-muted"
                   )}>
                     <Building2 className={cn(
                       "h-4 w-4",
                       ws.id === workspace.id ? "text-white" : "text-muted-foreground"
                     )} />
                   </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate text-foreground">{ws.name}</div>
                <div className="text-xs text-muted-foreground">
                  {ws.role === 'owner' ? 'Vlastník' : 'Člen'}
                </div>
              </div>
                   {ws.id === workspace.id && (
                     <div className="w-2 h-2 bg-gray-900 rounded-full" />
                   )}
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
