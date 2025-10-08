"use client";

import { cn } from "@/lib/utils";
import { Users, FolderKanban, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { toast } from "@/hooks/use-toast";

interface SideNavProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
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
];

export const SideNav = ({ isOpen, onClose }: SideNavProps) => {
  const pathname = usePathname();
  const { user, profile, signOut } = useAuth();

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
      case "owner":
        return "Majiteľ";
      case "designer":
        return "Grafik";
      default:
        return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "owner":
        return "text-yellow-600 bg-yellow-100";
      case "designer":
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
          "fixed left-0 top-14 z-40 h-[calc(100vh-3.5rem)] w-64 border-r border-border bg-background transition-transform duration-200 md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col gap-2 p-4">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Layers Task Manager</h2>
          </div>
          <nav className="flex flex-1 flex-col gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => onClose()}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.title}
                </Link>
              );
            })}
          </nav>
          
          {/* Theme switcher */}
          <div className="mt-auto border-t border-border pt-4">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm text-muted-foreground">Téma</span>
              <ThemeSwitcher />
            </div>
          </div>

          {/* User info at bottom */}
          {user && profile && (
            <div className="border-t border-border pt-4">
              <div className="flex items-center gap-3 px-3 py-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {getInitials(profile.name || user.email || "U")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {profile.name || user.email}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </p>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(
                      profile.role
                    )}`}
                  >
                    {getRoleLabel(profile.role)}
                  </span>
                </div>
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
      </aside>
    </>
  );
};

