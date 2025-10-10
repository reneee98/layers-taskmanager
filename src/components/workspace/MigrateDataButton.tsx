"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Loader2, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export function MigrateDataButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleMigrate = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/workspaces/migrate-data', {
        method: 'POST',
      });
      
      const result = await response.json();
      
      if (result.success) {
        setResults(result.results);
        setIsCompleted(true);
        toast({
          title: "Migrácia úspešná",
          description: result.message,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error migrating data:", error);
      toast({
        title: "Chyba pri migrácii",
        description: error instanceof Error ? error.message : "Nepodarilo sa migrovať dáta",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isCompleted) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-green-800">
            <CheckCircle className="h-5 w-5" />
            Migrácia dokončená
          </CardTitle>
          <CardDescription className="text-green-700">
            Všetky existujúce dáta boli presunuté do vášho workspace
          </CardDescription>
        </CardHeader>
        {results && (
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span>Klienti:</span>
                <span className="font-medium">{results.clients}</span>
              </div>
              <div className="flex justify-between">
                <span>Projekty:</span>
                <span className="font-medium">{results.projects}</span>
              </div>
              <div className="flex justify-between">
                <span>Úlohy:</span>
                <span className="font-medium">{results.tasks}</span>
              </div>
              <div className="flex justify-between">
                <span>Časové záznamy:</span>
                <span className="font-medium">{results.timeEntries}</span>
              </div>
              <div className="flex justify-between">
                <span>Komentáre:</span>
                <span className="font-medium">{results.comments}</span>
              </div>
              <div className="flex justify-between">
                <span>Priradenia:</span>
                <span className="font-medium">{results.assignees}</span>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Migrácia dát
        </CardTitle>
        <CardDescription>
          Presuňte všetky existujúce dáta (klienti, projekty, úlohy) do vášho workspace
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Button 
          onClick={handleMigrate} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Migrujem dáta...
            </>
          ) : (
            <>
              <Database className="mr-2 h-4 w-4" />
              Presunúť všetky dáta
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
