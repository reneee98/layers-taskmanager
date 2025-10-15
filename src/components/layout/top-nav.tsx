"use client";

import { Menu, Search, Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GlobalTimer } from "@/components/timer/GlobalTimer";
import { WorkspaceSwitcher } from "@/components/workspace/WorkspaceSwitcher";

interface TopNavProps {
  onMenuClick: () => void;
}

export const TopNav = ({ onMenuClick }: TopNavProps) => {

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-gray-200/50">
      <div className="w-full">
        <div className="flex h-16 items-center justify-between px-6">
          {/* Left side - Mobile menu + Logo */}
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden hover:bg-gray-100 rounded-full"
              onClick={onMenuClick}
              aria-label="Toggle menu"
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Logo and branding */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-sm">L</span>
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl font-bold text-gray-900">
                  Laydo
                </h1>
                <span className="text-xs text-gray-500">Alpha verzia 1.0</span>
              </div>
            </div>
          </div>

          {/* Center - Search bar (hidden on mobile) */}
          <div className="hidden md:flex flex-1 max-w-2xl mx-8">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Hľadať projekty, úlohy, klientov..."
                className="pl-12 pr-4 bg-gray-50 border-0 focus-visible:ring-2 focus-visible:ring-gray-900 rounded-full h-10"
              />
            </div>
          </div>

          {/* Right side - Actions and user menu */}
          <div className="flex items-center gap-3">
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

