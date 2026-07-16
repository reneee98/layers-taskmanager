"use client";

import { PersonalSettings } from "@/components/settings/PersonalSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, Download, Settings2, Trash2, User } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { DataToolbar } from "@/components/layout/data-toolbar";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  return (
    <div className="page-shell">
      <PageHeader
        title="Nastavenia"
        description="Profil, workspace a správa vašich dát."
        icon={Settings2}
      />

      <Tabs defaultValue="user" className="w-full">
        <DataToolbar className="mb-5">
          <TabsList className="h-9 bg-background">
            <TabsTrigger value="user">
              <User className="h-4 w-4" />
              <span>Profil a firma</span>
            </TabsTrigger>
            <TabsTrigger value="data">
              <Database className="h-4 w-4" />
              <span>Dáta</span>
            </TabsTrigger>
          </TabsList>
          <p className="px-1 text-xs text-muted-foreground">Zmeny profilu sa prejavia v celom workspace</p>
        </DataToolbar>

        <TabsContent value="user" className="space-y-6">
          <PersonalSettings />
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          <section className="surface-panel overflow-hidden">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold text-foreground">Dáta a export</h2>
              <p className="mt-1 text-xs text-muted-foreground">Stiahnutie alebo trvalé odstránenie vašich dát.</p>
            </div>
            <div className="divide-y divide-border">
              <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-medium text-foreground">Export dát</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Stiahnite si všetky svoje dáta vo formáte JSON.</p>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4" />
                  Exportovať
                </Button>
              </div>
              <div className="flex flex-col gap-4 bg-destructive/[0.025] px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-medium text-destructive">Vymazať účet</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Účet a všetky pridružené dáta budú odstránené natrvalo.</p>
                </div>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4" />
                  Vymazať účet
                </Button>
              </div>
            </div>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
