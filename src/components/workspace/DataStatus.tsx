"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Database, CheckCircle, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface DataStatusProps {}

interface DataCounts {
  clients: number;
  projects: number;
  tasks: number;
  timeEntries: number;
  comments: number;
  assignees: number;
  timers: number;
}

interface WorkspaceData {
  workspace: {
    id: string;
    name: string;
    description: string;
  };
  dataInWorkspace: DataCounts;
  dataNotMigrated: DataCounts;
  needsMigration: boolean;
}

export function DataStatus({}: DataStatusProps) {
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [migrating, setMigrating] = useState(false);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/workspaces/check-data');
      const result = await response.json();
      
      if (result.success) {
        setData(result);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error fetching data status:", error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa načítať stav dát",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleMigrate = async () => {
    setMigrating(true);
    try {
      const response = await fetch('/api/workspaces/migrate-data', {
        method: 'POST',
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Migrácia úspešná",
          description: result.message,
        });
        // Refresh the data after successful migration
        await fetchData();
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
      setMigrating(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Načítavam stav dát...</span>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="flex items-center justify-center py-8">
          <AlertCircle className="h-6 w-6 text-red-600 mr-2" />
          <span className="text-red-600">Nepodarilo sa načítať stav dát</span>
        </CardContent>
      </Card>
    );
  }

  const totalInWorkspace = Object.values(data.dataInWorkspace).reduce((sum, count) => sum + count, 0);
  const totalNotMigrated = Object.values(data.dataNotMigrated).reduce((sum, count) => sum + count, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Stav dát v workspace
          </CardTitle>
          <CardDescription>
            Workspace: <strong>{data.workspace.name}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-green-800 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                V workspace ({totalInWorkspace})
              </h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Klienti:</span>
                  <Badge variant="secondary">{data.dataInWorkspace.clients}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Projekty:</span>
                  <Badge variant="secondary">{data.dataInWorkspace.projects}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Úlohy:</span>
                  <Badge variant="secondary">{data.dataInWorkspace.tasks}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Časové záznamy:</span>
                  <Badge variant="secondary">{data.dataInWorkspace.timeEntries}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Komentáre:</span>
                  <Badge variant="secondary">{data.dataInWorkspace.comments}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Priradenia:</span>
                  <Badge variant="secondary">{data.dataInWorkspace.assignees}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Timery:</span>
                  <Badge variant="secondary">{data.dataInWorkspace.timers}</Badge>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-orange-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Nie sú migrované ({totalNotMigrated})
              </h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Klienti:</span>
                  <Badge variant="outline">{data.dataNotMigrated.clients}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Projekty:</span>
                  <Badge variant="outline">{data.dataNotMigrated.projects}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Úlohy:</span>
                  <Badge variant="outline">{data.dataNotMigrated.tasks}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Časové záznamy:</span>
                  <Badge variant="outline">{data.dataNotMigrated.timeEntries}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Komentáre:</span>
                  <Badge variant="outline">{data.dataNotMigrated.comments}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Priradenia:</span>
                  <Badge variant="outline">{data.dataNotMigrated.assignees}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Timery:</span>
                  <Badge variant="outline">{data.dataNotMigrated.timers}</Badge>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2">
              {data.needsMigration ? (
                <Badge variant="destructive">Potrebná migrácia</Badge>
              ) : (
                <Badge variant="default" className="bg-green-600">Všetko migrované</Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                {refreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Obnoviť
              </Button>
              {data.needsMigration && (
                <Button
                  size="sm"
                  onClick={handleMigrate}
                  disabled={migrating}
                >
                  {migrating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Database className="h-4 w-4 mr-2" />
                  )}
                  {migrating ? "Migruje..." : "Migrovať"}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
