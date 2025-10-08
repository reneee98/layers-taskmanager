"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Niečo sa pokazilo!</h2>
        <p className="mt-2 text-muted-foreground">
          {error.message || "Vyskytla sa neočakávaná chyba"}
        </p>
        <Button onClick={reset} className="mt-4">
          Skúsiť znova
        </Button>
      </div>
    </div>
  );
}

