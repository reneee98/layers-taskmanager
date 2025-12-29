"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, Mail, Lock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const supabase = createClient();
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        toast({
          title: "Úspešné prihlásenie",
          description: "Vitajte v Layers!",
        });
        
        // Redirect to dashboard page
        router.push("/dashboard");
        router.refresh();
      }
    } catch (error: any) {
      console.error("Login error:", error);
      
      let errorMessage = "Nepodarilo sa prihlásiť";
      
      if (error.message?.includes("Invalid login credentials")) {
        errorMessage = "Nesprávny email alebo heslo";
      } else if (error.message?.includes("Email not confirmed")) {
        errorMessage = "Email nie je potvrdený";
      } else if (error.message?.includes("fetch failed") || error.message?.includes("ENOTFOUND") || error.message?.includes("getaddrinfo")) {
        errorMessage = "Nepodarilo sa pripojiť k databáze. Skontroluj internetové pripojenie alebo Supabase URL.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Chyba prihlásenia",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-black p-4">
      {/* Animated color gradient background - very dark */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 animate-gradient-shift bg-gradient-to-br from-purple-950/40 via-black to-indigo-950/40" />
        <div className="absolute inset-0 animate-gradient-shift-reverse bg-gradient-to-br from-black via-purple-950/30 to-violet-950/30 opacity-60" />
        <div className="absolute inset-0 animate-gradient-shift bg-gradient-to-br from-blue-950/30 via-black to-indigo-950/30 opacity-50" style={{ animationDelay: '2s' }} />
      </div>

      {/* Animated background elements - darker colors */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating orbs with subtle color changes */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl animate-float animate-color-shift-dark" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl animate-float-reverse animate-color-shift-dark-reverse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl animate-float animate-color-shift-dark" style={{ animationDuration: '30s' }} />
        
        {/* Additional floating particles with subtle colors */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-pink-600/12 rounded-full blur-2xl animate-float animate-color-shift-dark" style={{ animationDuration: '15s' }} />
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-violet-600/12 rounded-full blur-2xl animate-float-reverse animate-color-shift-dark-reverse" style={{ animationDuration: '18s' }} />
        <div className="absolute top-1/3 right-1/4 w-24 h-24 bg-cyan-600/10 rounded-full blur-xl animate-float animate-color-shift-dark" style={{ animationDuration: '22s' }} />
      </div>

      {/* Grid pattern overlay with animation */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] animate-grid" />
      
      {/* Animated particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-primary/30 rounded-full animate-particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 20}s`,
              animationDuration: `${15 + Math.random() * 10}s`,
            }}
          />
        ))}
      </div>
      

      <div className="relative z-10 w-full max-w-md">
        <Card className="backdrop-blur-xl bg-card/80 dark:bg-card/90 border-border/50 shadow-2xl shadow-black/10">
          <CardContent className="p-8 sm:p-10">
            {/* Header */}
            <div className="text-center mb-8 space-y-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
                  Vitajte späť
                </h1>
                <p className="text-sm text-muted-foreground">
                  Prihláste sa do svojho účtu
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-foreground" />
                <Input
                  id="email"
                  type="email"
                    placeholder="Váš email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                    className={cn(
                      "pl-10 h-11 bg-background border-border",
                      "focus:border-primary focus:ring-2 focus:ring-primary/20",
                      "transition-all duration-200"
                    )}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Heslo
                </Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Zadajte heslo"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                    className={cn(
                      "pl-10 pr-10 h-11 bg-background border-border",
                      "focus:border-primary focus:ring-2 focus:ring-primary/20",
                      "transition-all duration-200"
                    )}
                  required
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <Button 
              type="submit" 
                className="w-full h-11 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 dark:text-black text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
              disabled={isLoading}
            >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Prihlasujem...
                  </>
                ) : (
                  "Prihlásiť sa"
                )}
            </Button>
          </form>

            {/* Footer */}
            <div className="mt-8 text-center space-y-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Alebo
                  </span>
                </div>
              </div>
              
            <p className="text-sm text-muted-foreground">
              Nemáte účet?{" "}
              <Link 
                href="/auth/register" 
                  className="font-medium text-foreground hover:text-blue-500 dark:hover:text-blue-400 transition-colors underline underline-offset-4"
              >
                Zaregistrujte sa
              </Link>
            </p>
              
              <p className="text-xs text-muted-foreground pt-2">
                Layers v{process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'}
              </p>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
