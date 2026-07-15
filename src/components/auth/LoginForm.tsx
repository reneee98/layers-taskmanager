"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, Loader2 } from "lucide-react";

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
      } else if (
        error.message?.includes("fetch failed") ||
        error.message?.includes("ENOTFOUND") ||
        error.message?.includes("getaddrinfo")
      ) {
        errorMessage =
          "Nepodarilo sa pripojiť k databáze. Skontroluj internetové pripojenie alebo Supabase URL.";
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
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4">
      {/* Subtle dot grid backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,hsl(var(--foreground)/0.05)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_45%,#000_60%,transparent_100%)]"
      />

      <div className="relative z-10 w-full max-w-sm animate-in-up">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary shadow-sm">
            <Image
              src="/images/layers-logo.svg"
              alt="Layers logo"
              width={20}
              height={20}
              className="h-5 w-auto object-contain invert dark:invert-0"
              priority
            />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Vitajte späť</h1>
            <p className="mt-1 text-sm text-muted-foreground">Prihláste sa do svojho účtu</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[13px] font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="meno@studio.sk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10"
                autoComplete="email"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[13px] font-medium">
                Heslo
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 pr-10"
                  autoComplete="current-password"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  aria-label={showPassword ? "Skryť heslo" : "Zobraziť heslo"}
                  className="absolute right-0 top-0 flex h-full w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="h-10 w-full" disabled={isLoading}>
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

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Nemáte účet?{" "}
            <Link
              href="/auth/register"
              className="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-muted-foreground"
            >
              Zaregistrujte sa
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground/70">
          Layers v{process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0"}
        </p>
      </div>
    </div>
  );
}
