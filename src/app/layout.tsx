import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LayoutProvider } from "@/components/providers/layout-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { TimerProvider } from "@/contexts/TimerContext";
import dynamic from "next/dynamic";

// Lazy load non-critical components
const Toaster = dynamic(() => import("@/components/ui/toaster").then(mod => ({ default: mod.Toaster })), {
  ssr: false,
});

const BugReporter = dynamic(() => import("@/components/bug-reporter/BugReporter").then(mod => ({ default: mod.BugReporter })), {
  ssr: false,
});

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Layers",
  description: "Profesionálny systém na správu úloh a projektov",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sk" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning={true}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <TimerProvider>
              <LayoutProvider>{children}</LayoutProvider>
            </TimerProvider>
          </AuthProvider>
        </ThemeProvider>
        <Toaster />
        <BugReporter />
      </body>
    </html>
  );
}

