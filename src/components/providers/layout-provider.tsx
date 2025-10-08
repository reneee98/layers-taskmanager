"use client";

import { useState, useEffect } from "react";
import { TopNav } from "@/components/layout/top-nav";
import { SideNav } from "@/components/layout/side-nav";
import { useAuth } from "@/contexts/AuthContext";

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
    <div className="relative min-h-screen">
      <TopNav onMenuClick={handleToggleSideNav} />
      <SideNav isOpen={isSideNavOpen} onClose={handleCloseSideNav} />
      <main className="md:pl-64">
        <div className="container mx-auto p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
};

