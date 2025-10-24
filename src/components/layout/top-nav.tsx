"use client";

import { Menu, Search, Command, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    <header className="sticky top-0 z-50 w-full">
      <div className="w-full px-6 pt-2.5">
        <div className="flex h-16 items-center">
          {/* Left side - Mobile menu and sidebar toggle */}
          <div className="flex items-center gap-4 flex-shrink-0">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden hover:bg-accent rounded-full"
              onClick={onMenuClick}
              aria-label="Toggle menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            {/* Desktop sidebar toggle */}
            {onToggleSidebar && (
              <Button
                variant="ghost"
                size="icon"
                className="hidden md:flex hover:bg-accent rounded-full"
                onClick={onToggleSidebar}
                aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {isSidebarCollapsed ? (
                  <PanelLeftOpen className="h-5 w-5" />
                ) : (
                  <PanelLeftClose className="h-5 w-5" />
                )}
              </Button>
            )}
          </div>

          {/* Center - Search bar */}
          <div className="flex-1 max-w-md">
            <SearchBar />
          </div>

          {/* Right side - Actions and user menu */}
          <div className="flex items-center gap-4 flex-shrink-0 ml-auto">
            {/* Workspace Switcher */}
            <WorkspaceSwitcher />
            
            {/* Global Timer */}
            <GlobalTimer />
          </div>
        </div>
      </div>
    </header>
  );
};

