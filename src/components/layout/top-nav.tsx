"use client";

import { Menu, Bell, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlobalTimer } from "@/components/timer/GlobalTimer";
import { WorkspaceSwitcher } from "@/components/workspace/WorkspaceSwitcher";
import { SearchBar } from "@/components/ui/search-bar";

interface TopNavProps {
  onMenuClick: () => void;
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
}

export const TopNav = ({ onMenuClick, onToggleSidebar, isSidebarCollapsed = false }: TopNavProps) => {

  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm border-b border-slate-200/60 dark:border-slate-800/60">
      <div className="w-full px-8 h-16 flex items-center justify-between">
        {/* Left side - Search bar */}
        <div className="flex-1 max-w-md">
          <SearchBar />
        </div>

        {/* Right side - Actions and user menu */}
        <div className="flex items-center gap-0 flex-shrink-0">
          {/* Notification bell */}
          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9 rounded-full hover:bg-accent"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {/* Red notification badge */}
            <span className="absolute top-2 right-2 h-1.5 w-1.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-950" />
          </Button>
          
          {/* Separator */}
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-4" />
          
          {/* Workspace Switcher */}
          <WorkspaceSwitcher />
        </div>
      </div>
    </header>
  );
};

