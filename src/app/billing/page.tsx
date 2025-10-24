"use client";

import { useState, useEffect } from "react";
import { BillingItem } from "@/types/database";
import { BillingTable } from "@/components/billing/BillingTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Euro, 
  Clock, 
  CheckCircle, 
  XCircle,
  RefreshCw
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function BillingPage() {
  const [billingItems, setBillingItems] = useState<BillingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'unbilled' | 'billed' | 'excluded'>('unbilled');
  const [stats, setStats] = useState({
    total: 0,
    unbilled: 0,
    billed: 0,
    excluded: 0,
    totalAmount: 0,
  });

  const fetchBillingItems = async (status: string = statusFilter) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/billing/items?status=${status}`);
      const result = await response.json();
      
      if (result.success) {
        setBillingItems(result.data);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error fetching billing items:', error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa načítať billing údaje.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const [unbilledRes, billedRes, excludedRes] = await Promise.all([
        fetch('/api/billing/items?status=unbilled'),
        fetch('/api/billing/items?status=billed'),
        fetch('/api/billing/items?status=excluded'),
      ]);

      const [unbilled, billed, excluded] = await Promise.all([
        unbilledRes.json(),
        billedRes.json(),
        excludedRes.json(),
      ]);

      const unbilledItems = unbilled.success ? unbilled.data : [];
      const billedItems = billed.success ? billed.data : [];
      const excludedItems = excluded.success ? excluded.data : [];

      const totalAmount = [...unbilledItems, ...billedItems].reduce(
        (sum, item) => sum + item.billing_amount_cents, 
        0
      );

      setStats({
        total: unbilledItems.length + billedItems.length + excludedItems.length,
        unbilled: unbilledItems.length,
        billed: billedItems.length,
        excluded: excludedItems.length,
        totalAmount,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchBillingItems();
    fetchStats();
  }, []);

  useEffect(() => {
    fetchBillingItems();
  }, [statusFilter]);

  const handleUpdate = (updatedItem: BillingItem) => {
    setBillingItems(prev => 
      prev.map(item => item.id === updatedItem.id ? updatedItem : item)
    );
    fetchStats();
  };

  const handleMarkAsBilled = async (itemId: string) => {
    try {
      const response = await fetch(`/api/tasks/${itemId}/billing`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bill_status: 'billed' }),
      });

      if (response.ok) {
        const result = await response.json();
        handleUpdate(result.data);
        toast({
          title: "Úspešne označené",
          description: "Úloha bola označená ako účtovaná.",
        });
      }
    } catch (error) {
      console.error('Error marking as billed:', error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa označiť úlohu ako účtovanú.",
        variant: "destructive",
      });
    }
  };

  const handleExcludeFromBilling = async (itemId: string) => {
    try {
      const response = await fetch(`/api/tasks/${itemId}/billing`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bill_status: 'excluded' }),
      });

      if (response.ok) {
        const result = await response.json();
        handleUpdate(result.data);
        toast({
          title: "Úspešne vylúčené",
          description: "Úloha bola vylúčená z billing-u.",
        });
      }
    } catch (error) {
      console.error('Error excluding from billing:', error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa vylúčiť úlohu z billing-u.",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (cents: number) => {
    return `€${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Billing</h1>
          <p className="text-gray-600">Správa fakturačných položiek</p>
        </div>
        <Button onClick={() => fetchBillingItems()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Obnoviť
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Celkom položiek</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Neúčtované</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.unbilled}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Účtované</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.billed}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Celková suma</CardTitle>
            <Euro className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(stats.totalAmount)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Table */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrovať podľa stavu" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unbilled">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-600" />
                  Neúčtované
                </div>
              </SelectItem>
              <SelectItem value="billed">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Účtované
                </div>
              </SelectItem>
              <SelectItem value="excluded">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-gray-600" />
                  Vylúčené
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <BillingTable
          items={billingItems}
          onUpdate={handleUpdate}
          onMarkAsBilled={handleMarkAsBilled}
          onExcludeFromBilling={handleExcludeFromBilling}
          loading={loading}
        />
      </div>
    </div>
  );
}
