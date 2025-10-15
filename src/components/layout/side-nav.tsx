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
  HelpCircle
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
    title: "Časové záznamy",
    href: "/time-entries",
    icon: Clock,
  },
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

export const SideNav = ({ isOpen, onClose }: SideNavProps) => {
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
        console.log('Fetching workspace stats...');
        const response = await fetch('/api/workspace-stats');
        const result = await response.json();
        
        console.log('Workspace stats response:', result);
        
        if (result.success) {
          setStats(result.data);
          console.log('Stats updated:', result.data);
        } else {
          console.error('API returned error:', result.error);
        }
      } catch (error) {
        console.error('Failed to fetch workspace stats:', error);
      } finally {
        setStatsLoading(false);
      }
    };

    if (workspace) {
      console.log('Workspace found, fetching stats for:', workspace.id);
      fetchStats();
    } else {
      console.log('No workspace found');
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
        return "text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20";
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
                   "group flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200",
                   isActive
                     ? "bg-gray-100 text-gray-900"
                     : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                 )}
        >
          <item.icon className={cn(
            "h-5 w-5 transition-colors",
            isActive ? "text-gray-900" : "text-gray-400 group-hover:text-gray-600"
          )} />
          <span className="flex-1">{item.title}</span>
          {'badge' in item && item.badge && href !== "/projects" && href !== "/invoices" && (
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs px-2 py-0.5 bg-gray-100 text-gray-600 border-gray-200",
                isActive ? "bg-gray-200 text-gray-700 border-gray-300" : ""
              )}
            >
              {item.badge}
            </Badge>
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
          "fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] w-72 bg-white border-r border-gray-200/50 transition-transform duration-300 md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Navigation */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Main Navigation */}
            <div className="space-y-1 mb-8">
              <div className="px-3 py-2">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  OVERVIEW
                </h2>
              </div>
              <div className="space-y-1">
                {renderNavItems(mainNavItems)}
              </div>
            </div>

            {/* Tools Navigation */}
            <div className="space-y-1 mb-8">
              <div className="px-3 py-2">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  NÁSTROJE
                </h2>
              </div>
              <div className="space-y-1">
                {renderNavItems(toolsNavItems)}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="space-y-1">
              <div className="px-3 py-2">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  ŠTATISTIKY
                </h2>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">Dnes trackované</span>
                  </div>
                  <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                    {statsLoading ? "..." : `${stats.todayTrackedHours}h`}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          
          {/* Bottom section - User info and theme */}
          <div className="border-t border-gray-200 p-6 space-y-4">
            {/* Theme switcher */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Téma</span>
              <ThemeSwitcher />
            </div>
            
            {/* User info */}
            {user && profile && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                       <Avatar className="h-10 w-10">
                         <AvatarFallback className="bg-gray-900 text-white font-semibold">
                           {getInitials(profile.display_name || user.email || "U")}
                         </AvatarFallback>
                       </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-gray-900">
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
                    className="h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full"
                    title="Nastavenia"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSignOut}
                    className="h-8 w-8 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full"
                    title="Odhlásiť sa"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

