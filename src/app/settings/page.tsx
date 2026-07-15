"use client";

import { PersonalSettings } from "@/components/settings/PersonalSettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Database } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="page-shell">
      {/* Header */}
      <div>
        <h1 className="page-heading">Nastavenia</h1>
        <p className="page-description">
          Spravujte svoje nastavenia a preferencie aplikácie
        </p>
      </div>

      <Tabs defaultValue="user" className="w-full">
        <TabsList>
          <TabsTrigger value="user">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Osobné</span>
          </TabsTrigger>
          <TabsTrigger value="data">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Dáta</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="user" className="space-y-6">
          <PersonalSettings />
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dáta a export</CardTitle>
              <CardDescription>
                Exportujte svoje dáta alebo ich zmazajte
          </CardDescription>
        </CardHeader>
        <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg border p-4">
                  <h3 className="font-semibold mb-2">Export dát</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Stiahnite si všetky svoje dáta vo formáte JSON
                  </p>
                  <button className="text-sm text-primary hover:underline">
                    Exportovať dáta
                  </button>
                </div>
                <div className="rounded-lg border border-destructive/50 p-4">
                  <h3 className="font-semibold mb-2 text-destructive">Vymazať účet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Trvalo odstrániť váš účet a všetky pridružené dáta
                  </p>
                  <button className="text-sm text-destructive hover:underline">
                    Vymazať účet
                  </button>
                </div>
              </div>
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
