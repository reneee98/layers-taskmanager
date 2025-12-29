"use client";

import { useEffect } from "react";

export default function ShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Force light mode for shared pages
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
    document.documentElement.style.colorScheme = "light";
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F8F8] light">
      {children}
    </div>
  );
}

