"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TopNavProps {
  onMenuClick: () => void;
}

export const TopNav = ({ onMenuClick }: TopNavProps) => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-6">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden mr-4"
          onClick={onMenuClick}
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex flex-1 items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-foreground">Layers Task Manager</h1>
          </div>
          <div className="flex items-center gap-4">
            {/* Right side content can go here if needed */}
          </div>
        </div>
      </div>
    </header>
  );
};

