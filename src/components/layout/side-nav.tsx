"use client";

import { cn } from "@/lib/utils";
import { Users, FolderKanban, LogOut, LayoutDashboard, FileText, UserCog, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { toast } from "@/hooks/use-toast";

interface SideNavProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems: Array<{
  title: string;
  href: string;
  icon: any;
  adminOnly?: boolean;
}> = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Klienti",
    href: "/clients",
    icon: Users,
  },
  {
    title: "Projekty",
    href: "/projects",
    icon: FolderKanban,
  },
  {
    title: "Faktúry",
    href: "/invoices",
    icon: FileText,
  },
  {
    title: "Správa používateľov",
    href: "/workspaces/members",
    icon: UserCog,
    adminOnly: true,
  },
];

export const SideNav = ({ isOpen, onClose }: SideNavProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const { workspace } = useWorkspace();

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

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "Administrátor";
      case "user":
        return "Používateľ";
      default:
        return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "text-red-600 bg-red-100";
      case "user":
        return "text-blue-600 bg-blue-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
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
          "fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] w-64 border-r border-border bg-background transition-transform duration-200 md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col gap-2 p-6">
          <nav className="flex flex-1 flex-col gap-2">
            {navItems.map((item) => {
              // Skip admin-only items if user is not workspace owner
              if (item.adminOnly && workspace?.role !== 'owner') {
                return null;
              }
              
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => onClose()}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.title}
                </Link>
              );
            })}
          </nav>
          
          {/* Bottom section - Theme switcher and User info */}
          <div className="mt-auto border-t border-border pt-4">
            {/* Theme switcher */}
            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-xs text-muted-foreground">Téma</span>
              <ThemeSwitcher />
            </div>
            
            {/* User info */}
            {user && profile && (
              <div className="flex items-center gap-2 px-4 py-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-sm">
                    {getInitials(profile.display_name || user.email || "U")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate text-muted-foreground">
                    {profile.display_name || user.email}
                  </p>
                </div>
                
                {/* User actions */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push("/settings")}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    title="Nastavenia"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSignOut}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
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

