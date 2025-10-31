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
  BarChart3,
  Clock,
  Star,
  TrendingUp,
  Calendar,
  HelpCircle,
  Euro
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
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
  },
  {
    title: "Klienti",
    href: "/clients",
    icon: Users,
  },
  {
    title: "Faktúry",
    href: "/invoices",
    icon: FileText,
    adminOnly: true,
  },
];

const toolsNavItems: Array<{
  title: string;
  href: string | ((workspaceId: string) => string);
  icon: any;
  adminOnly?: boolean;
}> = [
  {
    title: "Správa používateľov",
    href: (workspaceId: string) => `/workspaces/${workspaceId}/users`,
    icon: UserCog,
    adminOnly: true,
  },
  {
    title: "Nastavenia",
    href: "/settings",
    icon: Settings,
  },
];

interface WorkspaceStats {
  activeProjects: number;
  completedProjects: number;
  todayTrackedHours: number;
}

export const SideNav = ({ isOpen, onClose, isCollapsed = false, onToggleCollapse }: SideNavProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const { workspace } = useWorkspace();
  const [stats, setStats] = useState<WorkspaceStats>({ activeProjects: 0, completedProjects: 0, todayTrackedHours: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  // Fetch workspace stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/workspace-stats');
        const result = await response.json();
        
        if (result.success) {
          setStats(result.data);
        } else {
          console.error('Failed to fetch workspace stats:', result.error);
        }
      } catch (error) {
        console.error('Failed to fetch workspace stats:', error);
      } finally {
        setStatsLoading(false);
      }
    };

    if (workspace) {
      fetchStats();
    }
  }, [workspace]);

  // Refresh stats when time entry is added
  useEffect(() => {
    const handleTimeEntryAdded = () => {
      const fetchStats = async () => {
        try {
          const response = await fetch('/api/workspace-stats');
          const result = await response.json();
          
          if (result.success) {
            setStats(result.data);
          }
        } catch (error) {
          console.error('Failed to fetch workspace stats:', error);
        }
      };

      fetchStats();
    };

    window.addEventListener('timeEntryAdded', handleTimeEntryAdded);
    return () => window.removeEventListener('timeEntryAdded', handleTimeEntryAdded);
  }, []);

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

  const getRoleLabel = (role: string, isOwner: boolean = false) => {
    if (isOwner) return "Majiteľ";
    switch (role) {
      case "admin":
        return "Administrátor";
      case "member":
        return "Člen";
      case "user":
        return "Používateľ";
      default:
        return role;
    }
  };

  // Check if current user is owner of the workspace
  const isOwner = (workspace?.owner_id && profile?.id === workspace.owner_id) ||
    (workspace?.role === 'owner');

  const getRoleColor = (role: string, isOwner: boolean = false) => {
    if (isOwner) return "text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20";
    switch (role) {
      case "admin":
        return "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20";
      case "member":
        return "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20";
      case "user":
        return "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20";
      default:
        return "text-muted-foreground bg-muted";
    }
  };

  const renderNavItems = (items: typeof mainNavItems | typeof toolsNavItems) => {
    return items.map((item) => {
      // Skip admin-only items if user is not workspace owner
      if (item.adminOnly && !isOwner) {
        return null;
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
            <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-lg">L</span>
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <h1 className="text-2xl font-bold text-foreground">
                  Layers
                </h1>
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
                {renderNavItems(mainNavItems)}
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

            {/* Quick Stats */}
            {!isCollapsed && (
              <div className="space-y-1">
                <div className="px-3 py-2">
                  <h2 className="text-xs font-semibold text-muted-foreground tracking-wider">
                    Štatistiky
                  </h2>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Dnes trackované</span>
                    </div>
                    <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-800/30 dark:text-blue-300 dark:border-blue-700">
                      {statsLoading ? "..." : `${stats.todayTrackedHours}h`}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
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
                          className={cn("text-xs px-2 py-0.5", getRoleColor(profile.role || 'user', isOwner))}
                        >
                          {getRoleLabel(profile.role || 'user', isOwner)}
                        </Badge>
                      </div>
                    </div>
                    
                    {/* User actions */}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push("/settings")}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full"
                        title="Nastavenia"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
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

