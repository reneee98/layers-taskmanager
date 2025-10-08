"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { LoginForm } from "./LoginForm";

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: "owner" | "designer";
}

export function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      // User is not authenticated, stay on login page
      return;
    }

    if (!loading && user && profile && requiredRole) {
      // Check if user has required role
      if (profile.role !== requiredRole && profile.role !== "owner") {
        // User doesn't have required role, redirect to projects
        router.push("/projects");
      }
    }
  }, [user, profile, loading, requiredRole, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold mb-2">Načítavam profil...</h2>
          <p className="text-muted-foreground">
            Prosím počkajte, načítavame váš používateľský profil.
          </p>
        </div>
      </div>
    );
  }

  if (requiredRole && profile.role !== requiredRole && profile.role !== "owner") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Nedostatočné oprávnenia</h2>
          <p className="text-muted-foreground">
            Nemáte oprávnenia na prístup k tejto stránke.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
