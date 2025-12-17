"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { TopNav } from "@/components/layout/top-nav";
import { SideNav } from "@/components/layout/side-nav";
import { useAuth } from "@/contexts/AuthContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { PermissionProvider } from "@/contexts/PermissionContext";
import { WorkspaceUsersProvider } from "@/contexts/WorkspaceUsersContext";

interface LayoutProviderProps {
  children: React.ReactNode;
}

export const LayoutProvider = ({ children }: LayoutProviderProps) => {
  const [isSideNavOpen, setIsSideNavOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { user, loading } = useAuth();
  const pathname = usePathname();
  
  // Don't show layout for share routes
  const isShareRoute = pathname?.startsWith('/share');

  // Load sidebar state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('sidebar-collapsed');
    if (savedState !== null) {
      setIsSidebarCollapsed(JSON.parse(savedState));
    }
  }, []);

  // Save sidebar state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', JSON.stringify(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  const handleToggleSideNav = () => {
    setIsSideNavOpen((prev) => !prev);
  };

  const handleCloseSideNav = () => {
    setIsSideNavOpen(false);
  };

  const handleToggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => !prev);
  };

  // Don't show layout for share routes - return children directly
  if (isShareRoute) {
    return <>{children}</>;
  }

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
      <PermissionProvider>
        <WorkspaceUsersProvider>
          <div className="relative min-h-screen bg-[#F8F8F8] dark:bg-slate-950">
            <SideNav 
              isOpen={isSideNavOpen} 
              onClose={handleCloseSideNav}
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={handleToggleSidebarCollapse}
            />
            <div className={`transition-all duration-300 ${isSidebarCollapsed ? 'md:ml-16' : 'md:ml-72'}`}>
              <TopNav 
                onMenuClick={handleToggleSideNav}
                onToggleSidebar={handleToggleSidebarCollapse}
                isSidebarCollapsed={isSidebarCollapsed}
              />
              <main className="min-h-screen">
                <div className="w-full px-6 py-6">{children}</div>
              </main>
            </div>
          </div>
        </WorkspaceUsersProvider>
      </PermissionProvider>
    </WorkspaceProvider>
  );
};

