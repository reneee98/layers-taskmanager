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

export function WorkspaceSwitcher() {
  const { workspace, loading } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
        <Building2 className="h-4 w-4" />
        <span>Načítavam...</span>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
        <Building2 className="h-4 w-4" />
        <span>Žiadny workspace</span>
      </div>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 px-3 py-2 h-auto text-sm font-normal"
        >
          <Building2 className="h-4 w-4" />
          <span className="truncate max-w-[200px]">
            {workspace.name}
          </span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          Aktuálny workspace
        </div>
        <DropdownMenuItem className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{workspace.name}</div>
            <div className="text-xs text-muted-foreground">
              {workspace.role === 'owner' ? 'Vlastník' : 'Člen'}
            </div>
          </div>
        </DropdownMenuItem>
        <div className="border-t my-1" />
        <DropdownMenuItem 
          className="flex items-center gap-2"
          onClick={() => {
            toast({
              title: "Funkcia v príprave",
              description: "Vytváranie nového workspace bude dostupné čoskoro.",
            });
          }}
        >
          <Plus className="h-4 w-4" />
          <span>Vytvoriť nový workspace</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
