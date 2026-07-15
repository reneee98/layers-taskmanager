"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, RegisterInput } from "@/lib/validations/user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";

const AuthShell = ({ children }: { children: React.ReactNode }) => (
  <div className="relative flex min-h-screen items-center justify-center bg-background p-4">
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,hsl(var(--foreground)/0.05)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_45%,#000_60%,transparent_100%)]"
    />
    <div className="relative z-10 w-full max-w-sm animate-in-up">{children}</div>
  </div>
);

export function RegisterForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterInput) => {
    setIsLoading(true);

    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            display_name: data.display_name,
          },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      // Create profile via API endpoint after successful registration
      // This ensures display_name from registration form is saved
      if (signUpData.user) {
        // Create profile asynchronously - don't wait for it to complete
        fetch("/api/auth/create-profile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: signUpData.user.id,
            email: data.email,
            display_name: data.display_name, // Pass display_name from form
          }),
        }).catch((error) => {
          console.warn("Profile creation error (non-blocking):", error);
        });
      }

      setIsSuccess(true);
      toast({
        title: "Registrácia úspešná",
        description: "Skontrolujte svoj e-mail na potvrdenie registrácie.",
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        title: "Chyba pri registrácii",
        description: error.message || "Nepodarilo sa vytvoriť účet",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <AuthShell>
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <CheckCircle className="mx-auto h-10 w-10 text-emerald-500" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">Registrácia úspešná!</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Skontrolujte svoj e-mail na potvrdenie registrácie.
          </p>
          <Button onClick={() => router.push("/login")} className="mt-6 h-10 w-full">
            Prejsť na prihlásenie
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary shadow-sm">
          <Image
            src="/images/layers-logo.svg"
            alt="Layers logo"
            width={40}
            height={13}
            className="h-auto w-10 object-contain invert dark:invert-0"
            priority
          />
        </div>
        <div className="text-center">
          <h1 className="text-xl font-bold tracking-tight text-foreground">Vytvorte si účet</h1>
          <p className="mt-1 text-sm text-muted-foreground">Začnite prácu s Layers</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="display_name" className="text-[13px] font-medium">
              Meno
            </Label>
            <Input
              id="display_name"
              type="text"
              placeholder="Vaše meno"
              {...register("display_name")}
              className={cn("h-10", errors.display_name && "border-destructive")}
              disabled={isLoading}
            />
            {errors.display_name && (
              <p className="text-sm text-destructive">{errors.display_name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-[13px] font-medium">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="meno@studio.sk"
              {...register("email")}
              className={cn("h-10", errors.email && "border-destructive")}
              autoComplete="email"
              disabled={isLoading}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-[13px] font-medium">
              Heslo
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Minimálne 8 znakov"
                {...register("password")}
                className={cn("h-10 pr-10", errors.password && "border-destructive")}
                autoComplete="new-password"
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
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <Button type="submit" className="h-10 w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Registrujem...
              </>
            ) : (
              "Registrovať sa"
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Už máte účet?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-muted-foreground"
          >
            Prihláste sa
          </Link>
        </p>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground/70">
        Layers v{process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0"}
      </p>
    </AuthShell>
  );
}
