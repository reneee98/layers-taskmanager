"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface UserProfile {
  id: string;
  email: string;
  role: "member" | "admin" | "owner" | "designer";
  display_name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const isFetchingProfileRef = useRef(false);
  const lastFetchedUserIdRef = useRef<string | null>(null);

  const supabase = createClient();

  const refreshProfile = async (force = false) => {
    if (!user?.id) {
      setProfile(null);
      return;
    }

    // Prevent duplicate fetches
    if (isFetchingProfileRef.current && !force) {
      return;
    }

    // Skip if already fetched for this user
    if (!force && lastFetchedUserIdRef.current === user.id && profile) {
      return;
    }

    try {
      isFetchingProfileRef.current = true;
      
      // Simple fetch without timeout
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        setProfile(data);
        lastFetchedUserIdRef.current = user.id;
        return;
      }

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, create it
        // Get display_name from user metadata (from registration form) if available
        let displayName = user.user_metadata?.display_name || 
                          user.email?.split('@')[0] || 
                          'User';
        
        const { data: newProfile, error: createError } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            email: user.email || '',
            display_name: displayName,
            role: user.email === 'design@renemoravec.sk' ? 'admin' : 'member'
          })
          .select()
          .single();

        if (createError) {
          setProfile(null);
        } else {
          setProfile(newProfile);
          lastFetchedUserIdRef.current = user.id;
        }
      } else if (error) {
        setProfile(null);
      }
    } catch (error) {
      setProfile(null);
    } finally {
      isFetchingProfileRef.current = false;
    }
  };

  useEffect(() => {
    // Check if we're on a share route - don't block rendering for public pages
    const isShareRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/share');
    
    // For share routes, set loading to false immediately to not block rendering
    if (isShareRoute) {
      setLoading(false);
    }
    
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await refreshProfile();
        }
      } catch (error) {
        console.error("Error getting initial session:", error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          setUser(session?.user ?? null);
          
          if (session?.user) {
            await refreshProfile();
          } else {
            setProfile(null);
          }
        } catch (error) {
          console.error("Error in auth state change:", error);
        } finally {
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [user?.id]);

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error signing out:", error);
        throw error;
      }
      
      setUser(null);
      setProfile(null);
      
      // Clear any cached data
      localStorage.clear();
      sessionStorage.clear();
      
      // Redirect to login page after sign out
      window.location.href = "/login";
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  };

  const logout = async () => {
    await signOut();
  };

  const value = {
    user,
    profile,
    loading,
    signOut,
    logout,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}