"use client";

import { useState, useMemo, useCallback } from "react";
import { Mail, Pencil, Phone, Plus, Search, Trash2, UsersRound, X } from "lucide-react";
import { usePermission } from "@/hooks/usePermissions";
import { useOptimizedFetch } from "@/hooks/useOptimizedFetch";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { AuthGuard } from "@/components/auth/AuthGuard";
import dynamic from "next/dynamic";

// Lazy load ClientForm
const ClientForm = dynamic(() => import("@/components/clients/ClientForm").then(mod => ({ default: mod.ClientForm })), {
  loading: () => null,
  ssr: false,
});
import { toast } from "@/hooks/use-toast";
import type { Client } from "@/types/database";
import { PageHeader } from "@/components/layout/page-header";
import { PageState } from "@/components/layout/page-state";
import { MetricStrip } from "@/components/layout/metric-strip";
import { DataToolbar } from "@/components/layout/data-toolbar";

interface ClientsResponse {
  success: boolean;
  data: Client[];
  error?: string;
}

function ClientsPageContent() {
  const { hasPermission: canViewClients, isLoading: isLoadingPermission } = usePermission('pages', 'view_clients');
  const { workspaceRole, loading: workspaceLoading } = useWorkspace();
  const { profile } = useAuth();
  const isOwner = workspaceRole?.role === 'owner';
  const isAdmin = profile?.role === 'admin';
  // Admins and owners have all permissions, so they can fetch immediately
  const hasFullAccess = isOwner || isAdmin;
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | undefined>();

  // Memoize error handler to avoid recreating on every render
  const handleError = useCallback(() => {
    toast({
      title: "Chyba",
      description: "Nepodarilo sa načítať klientov",
      variant: "destructive",
    });
  }, []);

  // Determine if we should fetch - owners and admins can fetch immediately, others wait for permissions
  // Also wait for workspace to load to know if user is owner
  const shouldFetch = !workspaceLoading && (hasFullAccess || (!isLoadingPermission && canViewClients));
  
  // Fetch clients - owners and admins have all permissions, so fetch immediately
  // For non-owners/admins, wait for permission check
  const fetchUrl = shouldFetch ? "/api/clients" : null;
  
  const { data: clientsData, loading: isLoading, refetch, clearCache } = useOptimizedFetch<ClientsResponse>(
    fetchUrl,
    {
      cacheKey: "clients_list",
      cacheExpiry: 2 * 60 * 1000, // 2 minutes
      enabled: shouldFetch, // Enable when we should fetch
      onError: handleError,
    }
  );

  // Memoize clients array to avoid recreating on every render
  const clients = useMemo(() => {
    return clientsData?.success ? (clientsData.data || []) : [];
  }, [clientsData]);

  // Memoize filtered clients
  const filteredClients = useMemo(() => {
    return clients.filter(
      (client) =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone?.includes(searchTerm)
    );
  }, [searchTerm, clients]);

  const clientsWithEmail = useMemo(
    () => clients.filter((client) => Boolean(client.email)).length,
    [clients]
  );
  const clientsWithPhone = useMemo(
    () => clients.filter((client) => Boolean(client.phone)).length,
    [clients]
  );

  const handleDelete = async (id: string) => {
    if (!confirm("Naozaj chcete odstrániť tohto klienta?")) return;

    try {
      const response = await fetch(`/api/clients/${id}`, { method: "DELETE" });
      const result = await response.json();

      if (result.success) {
        toast({ title: "Úspech", description: "Klient bol odstránený" });
        clearCache(); // Clear cache and refetch
        await refetch();
      } else {
        toast({
          title: "Chyba",
          description: result.error || "Nepodarilo sa odstrániť klienta",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Chyba",
        description: "Nastala neočakávaná chyba",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingClient(undefined);
  };

  // Check permission - owners and admins have all permissions automatically
  if (!hasFullAccess && isLoadingPermission) {
    return <PageState variant="loading" title="Kontrolujem oprávnenia" />;
  }

  if (!hasFullAccess && !canViewClients) {
    return (
      <PageState
        variant="permission"
        title="Nemáte prístup ku klientom"
        description="O prístup môžete požiadať administrátora workspace."
      />
    );
  }

  return (
    <div className="page-shell">
      <PageHeader
        title="Klienti"
        description="Kontakty, fakturačné údaje a firmy na jednom mieste."
        icon={UsersRound}
        actions={
          <Button
          onClick={() => setIsFormOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Pridať klienta
          </Button>
        }
      />

      <MetricStrip
        items={[
          { label: "Všetci klienti", value: clients.length, icon: UsersRound },
          { label: "S emailom", value: clientsWithEmail, icon: Mail },
          { label: "S telefónom", value: clientsWithPhone, icon: Phone },
        ]}
      />

      <DataToolbar>
        <div className="relative w-full sm:max-w-sm">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            aria-label="Hľadať klienta"
            placeholder="Hľadať podľa názvu, emailu alebo telefónu"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="h-9 bg-background pl-9 pr-9"
          />
          {searchTerm && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Vymazať vyhľadávanie"
              onClick={() => setSearchTerm("")}
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        <p className="shrink-0 px-1 text-xs tabular-nums text-muted-foreground">
          {searchTerm ? `${filteredClients.length} z ${clients.length}` : `${clients.length} klientov`}
        </p>
      </DataToolbar>

      <div className="surface-panel overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead>Názov</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telefón</TableHead>
              <TableHead>IČO/DIČ</TableHead>
              <TableHead className="w-[92px] text-right">Akcie</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="p-0">
                  <PageState
                    compact
                    variant="loading"
                    title="Načítavam klientov"
                    className="rounded-none border-0"
                  />
                </TableCell>
              </TableRow>
            ) : filteredClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="p-0">
                  <PageState
                    compact
                    title={searchTerm ? "Nenašli sa žiadni klienti" : "Zatiaľ tu nie sú klienti"}
                    description={
                      searchTerm
                        ? "Skúste upraviť vyhľadávanie."
                        : "Pridajte prvého klienta a začnite k nemu priraďovať projekty."
                    }
                    icon={UsersRound}
                    action={
                      searchTerm ? (
                        <Button variant="outline" size="sm" onClick={() => setSearchTerm("")}>
                          Zrušiť filter
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => setIsFormOpen(true)}>
                          <Plus className="h-4 w-4" />
                          Pridať klienta
                        </Button>
                      )
                    }
                    className="rounded-none border-0"
                  />
                </TableCell>
              </TableRow>
            ) : (
              filteredClients.map((client) => (
                <TableRow key={client.id} className="group hover:bg-muted/25">
                  <TableCell>
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/45 text-[11px] font-semibold text-muted-foreground">
                        {client.name
                          .split(" ")
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((part) => part[0])
                          .join("")
                          .toUpperCase()}
                      </span>
                      <span className="truncate font-medium text-foreground">{client.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {client.email ? (
                      <a className="text-muted-foreground hover:text-foreground" href={`mailto:${client.email}`}>
                        {client.email}
                      </a>
                    ) : (
                      <span className="text-muted-foreground/60">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {client.phone ? (
                      <a className="text-muted-foreground hover:text-foreground" href={`tel:${client.phone}`}>
                        {client.phone}
                      </a>
                    ) : (
                      <span className="text-muted-foreground/60">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{client.tax_id || "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Upraviť klienta ${client.name}`}
                        onClick={() => handleEdit(client)}
                        className="h-8 w-8"
                      >
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Odstrániť klienta ${client.name}`}
                        onClick={() => handleDelete(client.id)}
                        className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ClientForm
        client={editingClient}
        open={isFormOpen}
        onOpenChange={handleFormClose}
        onSuccess={async () => {
          clearCache(); // Clear cache and refetch
          await refetch();
          handleFormClose();
        }}
      />
    </div>
  );
}

export default function ClientsPage() {
  return (
    <AuthGuard>
      <ClientsPageContent />
    </AuthGuard>
  );
}
