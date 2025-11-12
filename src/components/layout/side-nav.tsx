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
  Shield
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
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
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
  // Safely get workspace - use useContext directly to avoid throwing error
  const workspaceContext = useContext(WorkspaceContext);
  const workspace = workspaceContext?.workspace || null;
  const workspaceRole = useWorkspaceRole();
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  
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

  const renderNavItems = (items: typeof mainNavItems | typeof toolsNavItems) => {
    return items.map((item) => {
      // Skip admin-only items if user is not workspace owner
      if (item.adminOnly && !isOwner) {
        return null;
      }
      
      // Skip superadmin-only items if user is not superadmin
      if ('superadminOnly' in item && item.superadminOnly && !isSuperadmin) {
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
      return (
        <Link
          key={href}
          href={href}
          onClick={() => onClose()}
          className={cn(
            "group flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200",
            isCollapsed ? "px-3 py-3 justify-center" : "px-4 py-3",
            isActive
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
          title={isCollapsed ? item.title : undefined}
        >
          <item.icon className={cn(
            "h-5 w-5 transition-colors",
            isActive ? "text-accent-foreground" : "text-muted-foreground group-hover:text-accent-foreground"
          )} />
          {!isCollapsed && (
            <>
              <span className="flex-1">{item.title}</span>
              {'badge' in item && item.badge && href !== "/projects" && href !== "/invoices" && (
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs px-2 py-0.5 bg-muted text-muted-foreground border-border",
                    isActive ? "bg-accent text-accent-foreground border-accent" : ""
                  )}
                >
                  {item.badge}
                </Badge>
              )}
            </>
          )}
        </Link>
      );
    });
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
          "fixed left-0 top-0 z-40 h-screen bg-card border-r border-border transition-all duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          isCollapsed ? "w-16" : "w-72"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo and Branding */}
          <div className={cn(
            "flex items-center gap-3 border-b border-border transition-all duration-300",
            isCollapsed ? "px-3 py-6 justify-center" : "px-6 py-6"
          )}>
            <div className={cn(
              "flex items-center justify-center",
              isCollapsed ? "w-10 h-10" : "h-10"
            )}>
              <Image
                src="/images/layers-logo.svg"
                alt="Layers Logo"
                width={isCollapsed ? 40 : 120}
                height={40}
                className="object-contain"
                priority
              />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">v{process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0-alpha'}</span>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className={cn(
            "flex-1 overflow-y-auto transition-all duration-300",
            isCollapsed ? "p-3" : "p-6"
          )}>
            {/* Main Navigation */}
            <div className="space-y-1 mb-8">
              {!isCollapsed && (
                <div className="px-3 py-2">
                  <h2 className="text-xs font-semibold text-muted-foreground tracking-wider">
                    Overview
                  </h2>
                </div>
              )}
              <div className="space-y-1">
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
                  
                  // Special handling for "Projekty" - make it expandable
                  if (item.title === "Projekty" && !isCollapsed) {
                    const isProjectsExpanded = expandedProjects.has("projects");
                    
                    return (
                      <div key={href}>
                        <button
                          onClick={() => handleToggleProject("projects")}
                          className={cn(
                            "group flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200 px-4 py-3 w-full text-left",
                            isActive
                              ? "bg-accent text-accent-foreground"
                              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          )}
                        >
                          <item.icon className={cn(
                            "h-5 w-5 transition-colors flex-shrink-0",
                            isActive ? "text-accent-foreground" : "text-muted-foreground group-hover:text-accent-foreground"
                          )} />
                          <span className="flex-1">{item.title}</span>
                          {isProjectsExpanded ? (
                            <ChevronDown className="h-4 w-4 flex-shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 flex-shrink-0" />
                          )}
                        </button>
                        
                        {isProjectsExpanded && (
                          <div className="ml-4 space-y-0.5 border-l border-border pl-2 mt-1">
                            {/* Projekty */}
                            {canViewProjects && (
                              <Link
                                href="/projects"
                                onClick={() => onClose()}
                                className={cn(
                                  "flex items-center gap-2 rounded-md text-xs font-medium transition-all duration-200 px-3 py-1.5",
                                  pathname === "/projects"
                                    ? "bg-accent text-accent-foreground"
                                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                )}
                              >
                                <span>Projekty</span>
                              </Link>
                            )}
                            
                            {/* Úlohy bez projektu */}
                            {canViewTasks && (
                              <Link
                                href="/tasks"
                                onClick={() => onClose()}
                                className={cn(
                                  "flex items-center gap-2 rounded-md text-xs font-medium transition-all duration-200 px-3 py-1.5",
                                  pathname === "/tasks" || (pathname.includes("/tasks/") && !pathname.includes("/projects/"))
                                    ? "bg-accent text-accent-foreground"
                                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                )}
                              >
                                <span>Úlohy</span>
                              </Link>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }
                  
                  // Regular nav items
                  return renderNavItems([item])[0];
                })}
              </div>
            </div>

            {/* Tools Navigation */}
            <div className="space-y-1 mb-8">
              {!isCollapsed && (
                <div className="px-3 py-2">
                  <h2 className="text-xs font-semibold text-muted-foreground tracking-wider">
                    Nástroje
                  </h2>
                </div>
              )}
              <div className="space-y-1">
                {renderNavItems(toolsNavItems)}
              </div>
            </div>

          </div>
          
          {/* Bottom section - User info and theme */}
          <div className={cn(
            "border-t border-border space-y-4 transition-all duration-300",
            isCollapsed ? "p-3" : "p-6"
          )}>
            {/* Theme switcher */}
            {!isCollapsed && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Téma</span>
                <ThemeSwitcher />
              </div>
            )}
            
            {/* User info */}
            {user && profile && (
              <div className={cn(
                "flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-accent transition-colors",
                isCollapsed ? "justify-center" : ""
              )}>
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-gray-900 text-white font-semibold">
                    {getInitials(profile.display_name || user.email || "U")}
                  </AvatarFallback>
                </Avatar>
                {!isCollapsed && (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-foreground">
                        {profile.display_name || user.email}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs px-2 py-0.5", getRoleColor(
                            isOwner ? 'owner' : (workspaceRole?.role || 'member'), 
                            isOwner
                          ))}
                        >
                          {isOwner 
                            ? 'Majiteľ'
                            : workspaceRole 
                              ? getRoleDisplayName(workspaceRole.role)
                              : 'Člen' // Default while loading
                          }
                        </Badge>
                      </div>
                    </div>
                    
                    {/* User actions */}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleSignOut}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                        title="Odhlásiť sa"
                      >
                        <LogOut className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

