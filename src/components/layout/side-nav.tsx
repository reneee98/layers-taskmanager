"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { 
  Users, 
  FolderKanban, 
  LogOut, 
  LayoutDashboard, 
  FileText, 
  UserCog, 
  Settings,
  Home,
  Star,
  TrendingUp,
  Calendar,
  HelpCircle,
  Euro,
  Bug,
  ChevronRight,
  ChevronDown,
  Shield,
  MoreHorizontal
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace, WorkspaceContext } from "@/contexts/WorkspaceContext";
import { usePermission } from "@/hooks/usePermissions";
import { useContext } from "react";
import { getRoleLabel, getRoleDisplayName } from "@/lib/role-utils";
import { useWorkspaceRole } from "@/hooks/useWorkspaceRole";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTheme } from "next-themes";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";

interface SideNavProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const mainNavItems: Array<{
  title: string;
  href: string;
  icon: any;
  badge?: string;
  adminOnly?: boolean;
  permission?: { resource: string; action: string };
}> = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: Home,
  },
  {
    title: "Projekty",
    href: "/projects",
    icon: FolderKanban,
    permission: { resource: 'pages', action: 'view_projects' },
  },
  {
    title: "Klienti",
    href: "/clients",
    icon: Users,
    permission: { resource: 'pages', action: 'view_clients' },
  },
  {
    title: "Faktúry",
    href: "/invoices",
    icon: FileText,
    adminOnly: true,
    permission: { resource: 'pages', action: 'view_invoices' },
  },
];

const toolsNavItems: Array<{
  title: string;
  href: string | ((workspaceId: string) => string);
  icon: any;
  adminOnly?: boolean;
  superadminOnly?: boolean;
  permission?: { resource: string; action: string };
}> = [
  {
    title: "Správa používateľov",
    href: (workspaceId: string) => `/workspaces/${workspaceId}/users`,
    icon: UserCog,
    adminOnly: true,
    permission: { resource: 'pages', action: 'view_workspace_users' },
  },
  {
    title: "Role a oprávnenia",
    href: "/admin/roles",
    icon: Shield,
    superadminOnly: true,
    permission: { resource: 'pages', action: 'view_admin_roles' },
  },
  {
    title: "Bug reporty",
    href: "/admin/bugs",
    icon: Bug,
    superadminOnly: true,
    permission: { resource: 'pages', action: 'view_admin_bugs' },
  },
  {
    title: "Nastavenia",
    href: "/settings",
    icon: Settings,
    permission: { resource: 'pages', action: 'view_settings' },
  },
];


export const SideNav = ({ isOpen, onClose, isCollapsed = false, onToggleCollapse }: SideNavProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const { setTheme, theme } = useTheme();
  // Safely get workspace - use useContext directly to avoid throwing error
  const workspaceContext = useContext(WorkspaceContext);
  const workspace = workspaceContext?.workspace || null;
  const workspaceRole = useWorkspaceRole();
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [visibleProjectsCount, setVisibleProjectsCount] = useState<number | null>(null);
  
  // Check permissions for pages
  const { hasPermission: canViewDashboard } = usePermission('pages', 'view_dashboard');
  const { hasPermission: canViewProjects } = usePermission('pages', 'view_projects');
  const { hasPermission: canViewClients } = usePermission('pages', 'view_clients');
  const { hasPermission: canViewTasks } = usePermission('pages', 'view_tasks');
  const { hasPermission: canViewInvoices } = usePermission('pages', 'view_invoices');
  const { hasPermission: canViewSettings } = usePermission('pages', 'view_settings');
  const { hasPermission: canViewWorkspaceUsers } = usePermission('pages', 'view_workspace_users');
  const { hasPermission: canViewAdminRoles } = usePermission('pages', 'view_admin_roles');
  const { hasPermission: canViewAdminBugs } = usePermission('pages', 'view_admin_bugs');
  
  // Create permission map
  const pagePermissions = {
    'pages.view_dashboard': canViewDashboard,
    'pages.view_projects': canViewProjects,
    'pages.view_clients': canViewClients,
    'pages.view_invoices': canViewInvoices,
    'pages.view_settings': canViewSettings,
    'pages.view_workspace_users': canViewWorkspaceUsers,
    'pages.view_admin_roles': canViewAdminRoles,
    'pages.view_admin_bugs': canViewAdminBugs,
  };

  useEffect(() => {
    if (!workspace?.id || !canViewProjects) {
      setVisibleProjectsCount(null);
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    const fetchVisibleProjectsCount = async () => {
      try {
        const response = await fetch(
          `/api/projects?workspace_id=${workspace.id}&exclude_status=completed,cancelled`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const result = await response.json();
        if (!isActive) {
          return;
        }

        if (response.ok && result?.success && Array.isArray(result.data)) {
          setVisibleProjectsCount(result.data.length);
          return;
        }

        setVisibleProjectsCount(0);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }
        console.error("Error fetching visible projects count for sidebar:", error);
        if (isActive) {
          setVisibleProjectsCount(0);
        }
      }
    };

    void fetchVisibleProjectsCount();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [workspace?.id, canViewProjects]);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Úspešné odhlásenie",
        description: "Boli ste úspešne odhlásený.",
      });
    } catch (error) {
      console.error("Error signing out:", error);
      toast({
        title: "Chyba pri odhlásení",
        description: "Nastala chyba pri odhlasovaní.",
        variant: "destructive",
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };


  // Check if current user is owner of the workspace
  const isOwner = workspace ? 
    ((workspace.owner_id && profile?.id === workspace.owner_id) || (workspace.role === 'owner')) :
    false;

  // Check if current user is superadmin
  const isSuperadmin = user?.email === 'design@renemoravec.sk' || 
                       user?.email === 'rene@renemoravec.sk';

  const getRoleColor = (role: string, isOwner: boolean = false) => {
    if (isOwner || role?.toLowerCase() === 'owner') {
      return "text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20";
    }
    switch (role?.toLowerCase()) {
      case "admin":
      case "administrátor":
        return "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20";
      case "member":
      case "člen":
        return "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20";
      default:
        // Custom roles get a default color
        return "text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/20";
    }
  };


  const handleToggleProject = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };


  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen bg-white dark:bg-card border-r border-[#e2e8f0] dark:border-border shadow-[4px_0px_24px_-12px_rgba(0,0,0,0.1)] transition-all duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          isCollapsed ? "w-16" : "w-[287px]"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo and Branding */}
          <div className={cn(
            "flex items-center gap-3 transition-all duration-300",
            isCollapsed ? "px-3 py-6 justify-center" : "px-8 py-[18px]"
          )}>
            <div className={cn(
              "flex items-center justify-center bg-[#0f172b] dark:bg-primary rounded-[10px] shrink-0",
              isCollapsed ? "w-10 h-10" : "w-8 h-8"
            )}>
              <Image
                src="/images/layers-logo.svg"
                alt="Layers Logo"
                width={isCollapsed ? 40 : 18}
                height={isCollapsed ? 40 : 18}
                className="object-contain"
                style={{ width: "auto", height: "auto" }}
                priority
              />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col gap-[8.5px] flex-1 min-w-0">
                <h1 className="font-bold text-[20px] leading-5 text-[#0f172b] dark:text-foreground tracking-[-0.9492px]">
                  layers
                </h1>
                <p className="font-medium text-[10px] leading-[15px] text-[#90a1b9] dark:text-muted-foreground tracking-[1.1172px] uppercase">
                  Workspace
                </p>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className={cn(
            "flex-1 overflow-y-auto transition-all duration-300",
            isCollapsed ? "p-3" : "px-3 pt-6"
          )}>
            {/* Main Navigation */}
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-2">
                {!isCollapsed && (
                  <div className="opacity-80">
                    <h2 className="font-bold text-[10px] leading-[15px] text-[#90a1b9] dark:text-muted-foreground tracking-[1.1172px] uppercase pl-4">
                      Overview
                    </h2>
                  </div>
                )}
                <div className="flex flex-col gap-[2px] px-1">
                {mainNavItems.map((item) => {
                  // Skip admin-only items if user is not workspace owner
                  if (item.adminOnly && !isOwner) {
                    return null;
                  }
                  
                  // Check page permission if specified
                  if (item.permission) {
                    const permissionKey = `${item.permission.resource}.${item.permission.action}`;
                    if (!pagePermissions[permissionKey as keyof typeof pagePermissions]) {
                      return null;
                    }
                  }
                  
                  const href = item.href;
                  const isActive = pathname === href;
                  
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => onClose()}
                      className={cn(
                        "flex items-center justify-between h-[35.5px] px-[14px] rounded-[10px] transition-all duration-200",
                        isActive
                          ? "bg-[#f1f5f9] dark:bg-accent"
                          : "hover:bg-[#f1f5f9]/50 dark:hover:bg-accent/50"
                      )}
                    >
                      <div className="flex items-center gap-3 h-[19.5px]">
                        <item.icon className={cn(
                          "h-[18px] w-[18px] flex-shrink-0",
                          isActive 
                            ? "text-[#0f172b] dark:text-foreground" 
                            : "text-[#62748e] dark:text-muted-foreground"
                        )} />
                        <span className={cn(
                          "text-[13px] leading-[19.5px] tracking-[-0.4012px]",
                          isActive
                            ? "font-semibold text-[#0f172b] dark:text-foreground"
                            : "font-medium text-[#62748e] dark:text-muted-foreground"
                        )}>
                          {item.title}
                        </span>
                      </div>
                      {item.title === "Projekty" && !isCollapsed && (
                        <div className="flex items-center gap-2">
                          <div className="bg-[#f1f5f9] dark:bg-muted h-[19px] rounded-[8px] px-3 flex items-center justify-center">
                            <span className="font-bold text-[10px] leading-[15px] text-[#62748e] dark:text-muted-foreground tracking-[0.1172px]">
                              {visibleProjectsCount === null ? "..." : visibleProjectsCount}
                            </span>
                          </div>
                          <ChevronRight className="h-[14px] w-[14px] text-[#62748e] dark:text-muted-foreground" />
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>

              {/* Tools Navigation */}
              <div className="flex flex-col gap-2">
                {!isCollapsed && (
                  <div className="opacity-80">
                    <h2 className="font-bold text-[10px] leading-[15px] text-[#90a1b9] dark:text-muted-foreground tracking-[1.1172px] uppercase pl-4">
                      Nástroje
                    </h2>
                  </div>
                )}
                <div className="flex flex-col gap-[2px] px-1">
                  {toolsNavItems.map((item) => {
                    // Skip admin-only items if user is not workspace owner
                    if (item.adminOnly && !isOwner) {
                      return null;
                    }
                    
                    // Skip superadmin-only items if user is not superadmin
                    if (item.superadminOnly && !isSuperadmin) {
                      return null;
                    }
                    
                    // Check page permission if specified
                    if (item.permission) {
                      const permissionKey = `${item.permission.resource}.${item.permission.action}`;
                      if (!pagePermissions[permissionKey as keyof typeof pagePermissions]) {
                        return null;
                      }
                    }
                    
                    const href = typeof item.href === 'function' 
                      ? workspace?.id 
                        ? item.href(workspace.id) 
                        : '#'
                      : item.href;
                    
                    const isActive = pathname === href;
                    const isBugReporty = item.title === "Bug reporty";
                    
                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => onClose()}
                        className={cn(
                          "flex items-center justify-between rounded-[10px] px-[14px] transition-all duration-200",
                          isBugReporty ? "h-[37px]" : "h-[35.5px]",
                          isActive
                            ? "bg-[#f1f5f9] dark:bg-accent"
                            : "hover:bg-[#f1f5f9]/50 dark:hover:bg-accent/50"
                        )}
                      >
                        <div className="flex items-center gap-3 h-[19.5px]">
                          <item.icon className={cn(
                            "h-[18px] w-[18px] flex-shrink-0",
                            isActive 
                              ? "text-[#0f172b] dark:text-foreground" 
                              : "text-[#62748e] dark:text-muted-foreground"
                          )} />
                          <span className={cn(
                            "text-[13px] leading-[19.5px] tracking-[-0.4012px]",
                            isActive
                              ? "font-semibold text-[#0f172b] dark:text-foreground"
                              : "font-medium text-[#62748e] dark:text-muted-foreground"
                          )}>
                            {item.title}
                          </span>
                        </div>
                        {isBugReporty && (
                          <div className="bg-[#fef2f2] dark:bg-red-950/30 border border-[#ffe2e2] dark:border-red-900/50 h-[21px] rounded-[8px] px-[9.5px] flex items-center justify-center min-w-[20.813px]">
                            <span className="font-bold text-[10px] leading-[15px] text-[#e7000b] dark:text-red-400 tracking-[0.1172px]">
                              3
                            </span>
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>
          
          {/* Bottom section - User info and theme */}
          <div className={cn(
            "bg-[rgba(248,250,252,0.3)] dark:bg-muted/30 border-t border-[#f1f5f9] dark:border-border transition-all duration-300",
            isCollapsed ? "p-3" : "px-3 pt-[13px] pb-0"
          )}>
            <div className="flex flex-col gap-3">
              {/* Theme switcher */}
              {!isCollapsed && (
                <div className="flex items-center justify-between h-[18px] px-2">
                  <span className="font-semibold text-[11px] leading-[16.5px] text-[#90a1b9] dark:text-muted-foreground tracking-[0.0645px]">
                    Tmavý režim
                  </span>
                  <button
                    type="button"
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="bg-[rgba(226,232,240,0.6)] dark:bg-muted h-[18px] w-8 rounded-full relative transition-colors"
                  >
                    <div className={cn(
                      "bg-white dark:bg-background rounded-full shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] absolute top-[2px] h-[14px] w-[14px] transition-transform",
                      theme === 'dark' ? "translate-x-[14px]" : "translate-x-0"
                    )} />
                  </button>
                </div>
              )}
              
              {/* User info */}
              {user && profile && (
                <div className={cn(
                  "relative rounded-[14px] h-[54px]",
                  isCollapsed ? "flex justify-center items-center" : ""
                )}>
                  {!isCollapsed && (
                    <>
                      <Avatar className="absolute left-2 top-2 h-9 w-9 bg-[#f1f5f9] dark:bg-muted border border-[rgba(226,232,240,0.5)] dark:border-border shadow-[0px_0px_0px_1px_rgba(226,232,240,0.5)]">
                        <AvatarFallback className="bg-[#ececf0] dark:bg-muted text-[#45556c] dark:text-foreground font-bold text-[12px] leading-4">
                          {getInitials(profile.display_name || user.email || "U")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute left-14 top-[8.5px] flex flex-col gap-0">
                        <p className="font-semibold text-[14px] leading-5 text-[#314158] dark:text-foreground tracking-[-0.1504px]">
                          {profile.display_name || user.email?.split('@')[0] || 'User'}
                        </p>
                        <p className="font-medium text-[10px] leading-[15px] text-[#90a1b9] dark:text-muted-foreground tracking-[0.1172px]">
                          {user.email || ''}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-3 h-7 w-7 rounded-[8px]"
                        title="Možnosti"
                      >
                        <MoreHorizontal className="h-4 w-4 text-[#62748e] dark:text-muted-foreground" />
                      </Button>
                    </>
                  )}
                  {isCollapsed && (
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-[#f1f5f9] dark:bg-muted text-[#45556c] dark:text-foreground font-bold">
                        {getInitials(profile.display_name || user.email || "U")}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
