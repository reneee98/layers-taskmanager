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
import { ChevronDown, Building2, Plus } from "lucide-react";
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
               className="flex items-center gap-2 px-3 py-2 h-auto text-sm font-normal hover:bg-gray-100 rounded-lg transition-colors"
             >
               <div className="w-6 h-6 bg-gray-900 rounded-md flex items-center justify-center">
                 <Building2 className="h-3 w-3 text-white" />
               </div>
          <span className="truncate max-w-[200px] font-medium text-gray-900">
            {workspace.name}
          </span>
          <ChevronDown className="h-4 w-4 text-gray-500" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 p-2">
        <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Prepnúť workspace
        </div>
        <div className="space-y-1">
          {workspaces.map((ws) => (
            <DropdownMenuItem 
              key={ws.id}
              className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => handleWorkspaceSwitch(ws.id)}
            >
                   <div className={cn(
                     "w-8 h-8 rounded-lg flex items-center justify-center",
                     ws.id === workspace.id 
                       ? "bg-gray-900" 
                       : "bg-gray-100"
                   )}>
                     <Building2 className={cn(
                       "h-4 w-4",
                       ws.id === workspace.id ? "text-white" : "text-gray-500"
                     )} />
                   </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate text-gray-900">{ws.name}</div>
                <div className="text-xs text-gray-500">
                  {ws.role === 'owner' ? 'Vlastník' : 'Člen'}
                </div>
              </div>
                   {ws.id === workspace.id && (
                     <div className="w-2 h-2 bg-gray-900 rounded-full" />
                   )}
            </DropdownMenuItem>
          ))}
        </div>
        <div className="border-t border-gray-200 my-2" />
        <DropdownMenuItem className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
            <Plus className="h-4 w-4 text-gray-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900">Vytvoriť nový workspace</div>
            <div className="text-xs text-gray-500">
              Začať nový projekt
            </div>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
