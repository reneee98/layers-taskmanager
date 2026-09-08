"use client";

import { useState, useEffect, useContext } from "react";
import { cn } from "@/lib/utils";
import {
  Users,
  FolderKanban,
  LogOut,
  FileText,
  UserCog,
  Settings,
  Home,
  Bug,
  ChevronRight,
  Shield,
  MoreHorizontal,
  Moon,
  Sun,
  Clock3,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { WorkspaceContext } from "@/contexts/WorkspaceContext";
import { usePermission } from "@/hooks/usePermissions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";
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
  icon: LucideIcon;
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
    permission: { resource: "pages", action: "view_projects" },
  },
  {
    title: "Klienti",
    href: "/clients",
    icon: Users,
    permission: { resource: "pages", action: "view_clients" },
  },
  {
    title: "Časy",
    href: "/time-entries",
    icon: Clock3,
    permission: { resource: "pages", action: "view_time_entries" },
  },
  {
    title: "Faktúry",
    href: "/invoices",
    icon: FileText,
    adminOnly: true,
    permission: { resource: "pages", action: "view_invoices" },
  },
];

const toolsNavItems: Array<{
  title: string;
  href: string | ((workspaceId: string) => string);
  icon: LucideIcon;
  adminOnly?: boolean;
  superadminOnly?: boolean;
  permission?: { resource: string; action: string };
}> = [
  {
    title: "Správa používateľov",
    href: (workspaceId: string) => `/workspaces/${workspaceId}/users`,
    icon: UserCog,
    adminOnly: true,
    permission: { resource: "pages", action: "view_workspace_users" },
  },
  {
    title: "Role a oprávnenia",
    href: "/admin/roles",
    icon: Shield,
    superadminOnly: true,
    permission: { resource: "pages", action: "view_admin_roles" },
  },
  {
    title: "Bug reporty",
    href: "/admin/bugs",
    icon: Bug,
    superadminOnly: true,
    permission: { resource: "pages", action: "view_admin_bugs" },
  },
  {
    title: "Nastavenia",
    href: "/settings",
    icon: Settings,
    permission: { resource: "pages", action: "view_settings" },
  },
];

export const SideNav = ({ isOpen, onClose, isCollapsed = false }: SideNavProps) => {
  const pathname = usePathname();
  const { user, profile, signOut } = useAuth();
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // Safely get workspace - use useContext directly to avoid throwing error
  const workspaceContext = useContext(WorkspaceContext);
  const workspace = workspaceContext?.workspace || null;
  const [visibleProjectsCount, setVisibleProjectsCount] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check permissions for pages
  const { hasPermission: canViewProjects } = usePermission("pages", "view_projects");
  const { hasPermission: canViewClients } = usePermission("pages", "view_clients");
  const { hasPermission: canViewTimeEntries } = usePermission("pages", "view_time_entries");
  const { hasPermission: canViewInvoices } = usePermission("pages", "view_invoices");
  const { hasPermission: canViewSettings } = usePermission("pages", "view_settings");
  const { hasPermission: canViewWorkspaceUsers } = usePermission("pages", "view_workspace_users");
  const { hasPermission: canViewAdminRoles } = usePermission("pages", "view_admin_roles");
  const { hasPermission: canViewAdminBugs } = usePermission("pages", "view_admin_bugs");

  const pagePermissions = {
    "pages.view_projects": canViewProjects,
    "pages.view_clients": canViewClients,
    "pages.view_time_entries": canViewTimeEntries,
    "pages.view_invoices": canViewInvoices,
    "pages.view_settings": canViewSettings,
    "pages.view_workspace_users": canViewWorkspaceUsers,
    "pages.view_admin_roles": canViewAdminRoles,
    "pages.view_admin_bugs": canViewAdminBugs,
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
  const isOwner = workspace
    ? (workspace.owner_id && profile?.id === workspace.owner_id) || workspace.role === "owner"
    : false;

  // Check if current user is superadmin
  const isSuperadmin =
    user?.email === "design@renemoravec.sk" || user?.email === "rene@renemoravec.sk";

  const renderNavItem = (item: (typeof toolsNavItems)[number]) => {
    if (item.adminOnly && !isOwner) return null;
    if (item.superadminOnly && !isSuperadmin) return null;

    if (item.permission) {
      const permissionKey = `${item.permission.resource}.${item.permission.action}`;
      if (!pagePermissions[permissionKey as keyof typeof pagePermissions]) {
        return null;
      }
    }

    const href =
      typeof item.href === "function" ? (workspace?.id ? item.href(workspace.id) : "#") : item.href;
    const isActive = pathname === href;
    const showProjectsBadge = item.title === "Projekty" && !isCollapsed;

    return (
      <Link
        key={href}
        href={href}
        onClick={() => onClose()}
        title={isCollapsed ? item.title : undefined}
        className={cn(
          "group/nav flex h-8 items-center rounded-md px-2.5 transition-colors",
          isCollapsed ? "justify-center" : "justify-between",
          isActive
            ? "bg-accent text-foreground"
            : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
        )}
      >
        <span className="flex min-w-0 items-center gap-3">
          <item.icon
            className={cn(
              "h-4 w-4 shrink-0 transition-colors",
              isActive ? "text-foreground" : "text-muted-foreground group-hover/nav:text-foreground"
            )}
          />
          {!isCollapsed && (
            <span className={cn("truncate text-[13px]", isActive ? "font-medium" : "font-normal")}>
              {item.title}
            </span>
          )}
        </span>
        {showProjectsBadge && (
          <span className="flex items-center gap-1.5">
            <span className="flex h-5 min-w-[24px] items-center justify-center rounded-md border border-border/70 bg-card/60 px-1.5 text-[10px] font-medium tabular-nums text-muted-foreground">
              {visibleProjectsCount === null ? "…" : visibleProjectsCount}
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <button
          type="button"
          aria-label="Zavrieť navigáciu"
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "app-sidebar fixed left-0 top-0 z-40 h-screen border-r border-border transition-[width,transform] duration-200",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          isCollapsed ? "w-[60px]" : "w-[248px]"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div
            className={cn(
              "flex items-center gap-3",
              isCollapsed ? "justify-center px-3 py-3.5" : "px-4 py-3.5"
            )}
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary">
              <Image
                src="/images/layers-logo.svg"
                alt="Layers logo"
                width={20}
                height={7}
                className="object-contain invert dark:invert-0"
                priority
              />
            </div>
            {!isCollapsed && (
              <div className="flex min-w-0 flex-col">
                <span className="text-[14px] font-semibold leading-5 tracking-tight text-foreground">
                  Layers
                </span>
                <span className="text-[10px] leading-3 text-muted-foreground">Task manager</span>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className={cn("flex-1 overflow-y-auto", isCollapsed ? "px-2 pt-2" : "px-2.5 pt-2")}>
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-1">
                {!isCollapsed && (
                  <h2 className="px-2.5 pb-1 text-[10px] font-medium text-muted-foreground/70">
                    Prehľad
                  </h2>
                )}
                <div className="flex flex-col gap-0.5">{mainNavItems.map(renderNavItem)}</div>
              </div>

              <div className="flex flex-col gap-1">
                {!isCollapsed && (
                  <h2 className="px-2.5 pb-1 text-[10px] font-medium text-muted-foreground/70">
                    Nástroje
                  </h2>
                )}
                <div className="flex flex-col gap-0.5">{toolsNavItems.map(renderNavItem)}</div>
              </div>
            </div>
          </nav>

          {/* Bottom section */}
          <div className={cn("border-t border-border/80", isCollapsed ? "p-2" : "p-2.5")}>
            {!isCollapsed && (
              <button
                type="button"
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                className="mb-1 flex h-8 w-full items-center justify-between rounded-md px-2.5 text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground"
              >
                <span className="flex items-center gap-3 text-[13px] font-normal">
                  {mounted && resolvedTheme === "dark" ? (
                    <Sun className="h-[18px] w-[18px]" />
                  ) : (
                    <Moon className="h-[18px] w-[18px]" />
                  )}
                  {mounted && resolvedTheme === "dark" ? "Svetlý režim" : "Tmavý režim"}
                </span>
                <span
                  className={cn(
                    "relative h-[18px] w-8 rounded-full transition-colors",
                    mounted && resolvedTheme === "dark" ? "bg-primary" : "bg-border"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-[2px] h-[14px] w-[14px] rounded-full bg-card shadow-sm transition-transform",
                      mounted && resolvedTheme === "dark"
                        ? "translate-x-[16px]"
                        : "translate-x-[2px]"
                    )}
                  />
                </span>
              </button>
            )}

            {/* User */}
            {user && profile && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors hover:bg-accent/70",
                      isCollapsed && "justify-center p-1.5"
                    )}
                    aria-label="Používateľské menu"
                  >
                    <Avatar className="h-8 w-8 shrink-0 border border-border">
                      <AvatarFallback className="bg-muted text-[11px] font-medium text-foreground">
                        {getInitials(profile.display_name || user.email || "U")}
                      </AvatarFallback>
                    </Avatar>
                    {!isCollapsed && (
                      <>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-[13px] font-medium text-foreground">
                            {profile.display_name || user.email?.split("@")[0] || "User"}
                          </span>
                          <span className="truncate text-[11px] text-muted-foreground">
                            {user.email || ""}
                          </span>
                        </span>
                        <MoreHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="top" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <span className="block text-sm font-semibold text-foreground">
                      {profile.display_name || "Používateľ"}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      Nastavenia
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Odhlásiť sa
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
