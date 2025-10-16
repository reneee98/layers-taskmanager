"use client";

import { useState, useEffect } from "react";
import { TopNav } from "@/components/layout/top-nav";
import { SideNav } from "@/components/layout/side-nav";
import { useAuth } from "@/contexts/AuthContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";

interface LayoutProviderProps {
  children: React.ReactNode;
}

export const LayoutProvider = ({ children }: LayoutProviderProps) => {
  const [isSideNavOpen, setIsSideNavOpen] = useState(false);
  const { user, loading } = useAuth();

  const handleToggleSideNav = () => {
    setIsSideNavOpen((prev) => !prev);
  };

  const handleCloseSideNav = () => {
    setIsSideNavOpen(false);
  };

  // If loading, show loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If user is not authenticated, show only children (login screen)
  if (!user) {
    return <>{children}</>;
  }

  // If user is authenticated, show full layout
  return (
    <WorkspaceProvider>
      <div className="relative min-h-screen bg-[#F8F8F8] dark:bg-slate-950">
        <SideNav isOpen={isSideNavOpen} onClose={handleCloseSideNav} />
        <div className="md:ml-72">
          <TopNav onMenuClick={handleToggleSideNav} />
          <main className="min-h-screen">
            <div className="w-full px-6 py-6">{children}</div>
          </main>
        </div>
      </div>
    </WorkspaceProvider>
  );
};

