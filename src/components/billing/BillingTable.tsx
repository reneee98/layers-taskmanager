"use client";

import { useState, useEffect } from "react";
import { BillingItem } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Euro,
  Edit,
  MoreHorizontal
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface BillingTableProps {
  items: BillingItem[];
  onUpdate: (item: BillingItem) => void;
  onMarkAsBilled: (itemId: string) => void;
  onExcludeFromBilling: (itemId: string) => void;
  loading?: boolean;
}

export const BillingTable = ({ 
  items, 
  onUpdate, 
  onMarkAsBilled, 
  onExcludeFromBilling,
  loading = false 
}: BillingTableProps) => {
  const [editingItem, setEditingItem] = useState<BillingItem | null>(null);
  const [editForm, setEditForm] = useState({
    hourly_rate_cents: 0,
    actual_minutes: 0,
  });

  const handleEdit = (item: BillingItem) => {
    setEditingItem(item);
    setEditForm({
      hourly_rate_cents: item.hourly_rate_cents,
      actual_minutes: item.actual_minutes,
    });
  };

  const handleSave = async () => {
    if (!editingItem) return;

    try {
      const response = await fetch(`/api/tasks/${editingItem.id}/billing`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        throw new Error('Failed to update billing');
      }

      const result = await response.json();
      onUpdate(result.data);
      setEditingItem(null);
      
      toast({
        title: "Úspešne aktualizované",
        description: "Billing údaje boli aktualizované.",
      });
    } catch (error) {
      console.error('Error updating billing:', error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa aktualizovať billing údaje.",
        variant: "destructive",
      });
    }
  };

  const getBillStatusBadge = (status: string) => {
    switch (status) {
      case 'unbilled':
        return (
          <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">
            <Clock className="h-3 w-3 mr-1" />
            Neúčtované
          </Badge>
        );
      case 'billed':
        return (
          <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
            <CheckCircle className="h-3 w-3 mr-1" />
            Účtované
          </Badge>
        );
      case 'excluded':
        return (
          <Badge variant="outline" className="text-gray-600 border-gray-200 bg-gray-50">
            <XCircle className="h-3 w-3 mr-1" />
            Vylúčené
          </Badge>
        );
      default:
        return null;
    }
  };

  const formatCurrency = (cents: number) => {
    return `€${(cents / 100).toFixed(2)}`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Načítavam billing údaje...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Euro className="h-5 w-5" />
          Billing Items
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Žiadne billing položky
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Názov úlohy</TableHead>
                  <TableHead>Projekt</TableHead>
                  <TableHead>Klient</TableHead>
                  <TableHead>Čas</TableHead>
                  <TableHead>Sadzba/h</TableHead>
                  <TableHead>Suma</TableHead>
                  <TableHead>Stav</TableHead>
                  <TableHead>Akcie</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{item.title}</div>
                        {item.description && (
                          <div className="text-sm text-gray-500 line-clamp-1">
                            {item.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {item.project_name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {item.client_name || '—'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {item.time_formatted}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatCurrency(item.hourly_rate_cents)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {formatCurrency(item.billing_amount_cents)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getBillStatusBadge(item.bill_status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {item.bill_status === 'unbilled' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onMarkAsBilled(item.id)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        {item.bill_status !== 'excluded' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onExcludeFromBilling(item.id)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upraviť billing údaje</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="hourly_rate">Hodinová sadzba (€)</Label>
                <Input
                  id="hourly_rate"
                  type="number"
                  step="0.01"
                  value={editForm.hourly_rate_cents / 100}
                  onChange={(e) => setEditForm({
                    ...editForm,
                    hourly_rate_cents: Math.round(parseFloat(e.target.value) * 100)
                  })}
                />
              </div>
              <div>
                <Label htmlFor="actual_minutes">Skutočný čas (minúty)</Label>
                <Input
                  id="actual_minutes"
                  type="number"
                  value={editForm.actual_minutes}
                  onChange={(e) => setEditForm({
                    ...editForm,
                    actual_minutes: parseInt(e.target.value) || 0
                  })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingItem(null)}>
                  Zrušiť
                </Button>
                <Button onClick={handleSave}>
                  Uložiť
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
