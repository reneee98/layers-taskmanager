"use client";

import { useState } from "react";
import { Task } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  Save,
  Loader2
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface BillingPanelProps {
  task: Task;
  onUpdate: () => void;
}

export const BillingPanel = ({ task, onUpdate }: BillingPanelProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    billable: task.billable || false,
    bill_status: task.bill_status || 'unbilled',
    hourly_rate_cents: task.hourly_rate_cents || 0,
    actual_minutes: task.actual_minutes || 0,
  });

  const handleSave = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/tasks/${task.id}/billing`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to update billing');
      }

      const result = await response.json();
      
      toast({
        title: "Úspešne uložené",
        description: "Billing údaje boli aktualizované.",
      });
      
      onUpdate();
    } catch (error) {
      console.error('Error updating billing:', error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa uložiť billing údaje.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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

  const calculateBillingAmount = () => {
    if (formData.hourly_rate_cents > 0 && formData.actual_minutes > 0) {
      return Math.round((formData.hourly_rate_cents * formData.actual_minutes) / 60);
    }
    return 0;
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Fakturácia</h3>
          <p className="text-sm text-gray-600">Nastavenie billing údajov pre túto úlohu</p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Uložiť
        </Button>
      </div>

      {/* Billing Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Základné nastavenia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Billable Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="billable">Účtovateľné</Label>
                  <p className="text-sm text-gray-600">
                    Určuje, či je táto úloha účtovateľná klientovi
                  </p>
                </div>
                <Switch
                  id="billable"
                  checked={formData.billable}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, billable: checked }))
                  }
                />
              </div>

              {/* Bill Status */}
              <div className="space-y-2">
                <Label htmlFor="bill_status">Stav účtovania</Label>
                <Select
                  value={formData.bill_status}
                  onValueChange={(value) => 
                    setFormData(prev => ({ ...prev, bill_status: value as any }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
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
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Čas a sadzba</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Hourly Rate */}
              <div className="space-y-2">
                <Label htmlFor="hourly_rate">Hodinová sadzba (€)</Label>
                <Input
                  id="hourly_rate"
                  type="number"
                  step="0.01"
                  value={formData.hourly_rate_cents / 100}
                  onChange={(e) => 
                    setFormData(prev => ({ 
                      ...prev, 
                      hourly_rate_cents: Math.round(parseFloat(e.target.value) * 100) 
                    }))
                  }
                  placeholder="0.00"
                />
              </div>

              {/* Actual Minutes */}
              <div className="space-y-2">
                <Label htmlFor="actual_minutes">Skutočný čas (minúty)</Label>
                <Input
                  id="actual_minutes"
                  type="number"
                  value={formData.actual_minutes}
                  onChange={(e) => 
                    setFormData(prev => ({ 
                      ...prev, 
                      actual_minutes: parseInt(e.target.value) || 0 
                    }))
                  }
                  placeholder="0"
                />
                <p className="text-sm text-gray-600">
                  Formátovaný čas: {formatTime(formData.actual_minutes)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Prehľad fakturácie</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(formData.hourly_rate_cents)}
              </div>
              <div className="text-sm text-gray-600">Hodinová sadzba</div>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">
                {formatTime(formData.actual_minutes)}
              </div>
              <div className="text-sm text-gray-600">Skutočný čas</div>
            </div>
            
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(calculateBillingAmount())}
              </div>
              <div className="text-sm text-gray-600">Celková suma</div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Stav účtovania:</span>
              {getBillStatusBadge(formData.bill_status)}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
