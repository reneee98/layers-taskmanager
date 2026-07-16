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
  const isShareRoute = pathname?.startsWith("/share");
  const isFullWidthRoute = pathname === "/dashboard";

  // Load sidebar state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem("sidebar-collapsed");
    if (savedState !== null) {
      setIsSidebarCollapsed(JSON.parse(savedState));
    }
  }, []);

  // Save sidebar state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", JSON.stringify(isSidebarCollapsed));
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

  // Keep dependent contexts mounted while authentication initializes. An auth redirect
  // can render a protected page before AuthProvider publishes the user.
  return (
    <WorkspaceProvider>
      <PermissionProvider>
        <WorkspaceUsersProvider>
          {loading ? (
            <div className="flex min-h-screen items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
            </div>
          ) : !user ? (
            <>{children}</>
          ) : (
            <div className="app-shell relative min-h-screen">
              <SideNav
                isOpen={isSideNavOpen}
                onClose={handleCloseSideNav}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={handleToggleSidebarCollapse}
              />
              <div
                className={`transition-[margin] duration-200 ${isSidebarCollapsed ? "md:ml-[60px]" : "md:ml-[248px]"}`}
              >
                <TopNav
                  onMenuClick={handleToggleSideNav}
                  onToggleSidebar={handleToggleSidebarCollapse}
                  isSidebarCollapsed={isSidebarCollapsed}
                />
                <main className="min-h-[calc(100vh-3.25rem)]">
                  <div
                    className={`mx-auto w-full py-5 sm:py-7 lg:py-8 ${
                      isFullWidthRoute
                        ? "max-w-none px-3 sm:px-5 lg:px-6"
                        : "max-w-[1480px] px-4 sm:px-6 lg:px-8"
                    }`}
                  >
                    {children}
                  </div>
                </main>
              </div>
            </div>
          )}
        </WorkspaceUsersProvider>
      </PermissionProvider>
    </WorkspaceProvider>
  );
};
