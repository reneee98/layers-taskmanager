"use client";

import { PersonalSettings } from "@/components/settings/PersonalSettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Database } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Nastavenia</h1>
        <p className="text-muted-foreground mt-2">
          Spravujte svoje nastavenia a preferencie aplikácie
        </p>
      </div>

      <Tabs defaultValue="user" className="w-full">
        <TabsList className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
          <TabsTrigger value="user" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
            <User className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Osobné</span>
          </TabsTrigger>
          <TabsTrigger value="data" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
            <Database className="h-4 w-4 mr-2" />
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
