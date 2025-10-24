"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
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
import { ClientForm } from "@/components/clients/ClientForm";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { toast } from "@/hooks/use-toast";
import type { Client } from "@/types/database";
import { cn } from "@/lib/utils";

function ClientsPageContent() {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | undefined>();

  const fetchClients = async () => {
    try {
      const response = await fetch("/api/clients");
      const result = await response.json();

      if (result.success) {
        setClients(result.data);
        setFilteredClients(result.data);
      }
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa načítať klientov",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    const filtered = clients.filter(
      (client) =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone?.includes(searchTerm)
    );
    setFilteredClients(filtered);
  }, [searchTerm, clients]);

  const handleDelete = async (id: string) => {
    if (!confirm("Naozaj chcete odstrániť tohto klienta?")) return;

    try {
      const response = await fetch(`/api/clients/${id}`, { method: "DELETE" });
      const result = await response.json();

      if (result.success) {
        toast({ title: "Úspech", description: "Klient bol odstránený" });
        fetchClients();
      } else {
        toast({
          title: "Chyba",
          description: result.error || "Nepodarilo sa odstrániť klienta",
          variant: "destructive",
        });
      }
    } catch (error) {
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

  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Klienti</h1>
          <p className="text-muted-foreground mt-1">Spravujte svojich klientov</p>
        </div>
        <Button 
          onClick={() => setIsFormOpen(true)}
          className="bg-gray-900 text-white hover:bg-gray-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          Pridať klienta
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <Input
          placeholder="Hľadať klienta..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm bg-card border-border"
        />
      </div>

      {/* Clients Table */}
      <div className="bg-card border border-border rounded-lg shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted">
              <TableHead className="text-muted-foreground font-semibold">Názov</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Email</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Telefón</TableHead>
              <TableHead className="text-muted-foreground font-semibold">IČO/DIČ</TableHead>
              <TableHead className="w-[100px] text-muted-foreground font-semibold">Akcie</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  Načítavam...
                </TableCell>
              </TableRow>
            ) : filteredClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                      <Plus className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-lg font-medium">Žiadni klienti</p>
                    <p className="text-sm">Začnite pridaním nového klienta</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredClients.map((client) => (
                <TableRow key={client.id} className="hover:bg-muted transition-colors">
                  <TableCell className="font-medium text-foreground">{client.name}</TableCell>
                  <TableCell className="text-muted-foreground">{client.email || "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{client.phone || "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{client.tax_id || "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(client)}
                        className="h-8 w-8 hover:bg-muted"
                      >
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(client.id)}
                        className="h-8 w-8 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
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
        onSuccess={() => {
          fetchClients();
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

