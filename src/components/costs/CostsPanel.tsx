"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/format";
import { format } from "date-fns";

interface CostItem {
  id: string;
  project_id: string;
  task_id: string | null;
  name: string;
  description: string | null;
  category: string | null;
  amount: number;
  date: string;
  is_billable: boolean;
  created_at: string;
}

interface Task {
  id: string;
  title: string;
}

interface CostsPanelProps {
  projectId: string;
  tasks: Task[];
  defaultTaskId?: string;
  onCostAdded?: () => void;
}

const COST_CATEGORIES = [
  "Software",
  "Hardware",
  "Licence",
  "Graphics",
  "Marketing",
  "Travel",
  "Other",
];

export function CostsPanel({ projectId, tasks, defaultTaskId, onCostAdded }: CostsPanelProps) {
  const [costItems, setCostItems] = useState<CostItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Other");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [taskId, setTaskId] = useState<string>(defaultTaskId || "");

  const fetchCostItems = async () => {
    try {
      const response = await fetch(`/api/costs?project_id=${projectId}`);
      const result = await response.json();

      if (result.success) {
        setCostItems(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch cost items:", error);
    }
  };

  useEffect(() => {
    fetchCostItems();
  }, [projectId]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setCategory("Other");
    setAmount("");
    setDate(new Date().toISOString().split("T")[0]);
    setTaskId("");
  };

  const handleSubmit = async () => {
    const amountValue = parseFloat(amount);
    if (!name || isNaN(amountValue) || amountValue <= 0) {
      toast({
        title: "Chyba",
        description: "Vyplňte všetky povinné polia",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        project_id: projectId,
        task_id: taskId || null,
        name,
        description: description || null,
        category,
        amount: amountValue,
        date,
        is_billable: true,
      };

      const response = await fetch("/api/costs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Úspech",
          description: `Náklad pridaný • ${formatCurrency(amountValue)}`,
        });

        resetForm();
        setIsDialogOpen(false);
        fetchCostItems();
        
        // Notify parent component
        if (onCostAdded) {
          onCostAdded();
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Chyba",
        description: error instanceof Error ? error.message : "Nepodarilo sa pridať náklad",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Naozaj chcete vymazať tento náklad?")) return;

    try {
      const response = await fetch(`/api/costs/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        toast({ title: "Úspech", description: "Náklad bol odstránený" });
        fetchCostItems();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Chyba",
        description: error instanceof Error ? error.message : "Nepodarilo sa odstrániť náklad",
        variant: "destructive",
      });
    }
  };

  const totalCost = costItems.reduce((sum, item) => sum + item.amount, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Náklady projektu</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Pridať náklad
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Pridať náklad</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Názov *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="napr. Grafická práca"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Popis</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Detailný popis nákladu..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Kategória</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COST_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">Suma (€) *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="250.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Dátum</Label>
                    <Input
                      id="date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="task">Úloha (voliteľné)</Label>
                    <Select value={taskId || "none"} onValueChange={(val) => setTaskId(val === "none" ? "" : val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Žiadna úloha" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Žiadna úloha</SelectItem>
                        {tasks.map((task) => (
                          <SelectItem key={task.id} value={task.id}>
                            {task.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Zrušiť
                  </Button>
                  <Button onClick={handleSubmit} disabled={isLoading}>
                    {isLoading ? "Ukladám..." : "Pridať náklad"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Názov</TableHead>
              <TableHead>Kategória</TableHead>
              <TableHead>Dátum</TableHead>
              <TableHead>Úloha</TableHead>
              <TableHead className="text-right">Suma</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {costItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Žiadne náklady
                </TableCell>
              </TableRow>
            ) : (
              costItems.map((item) => {
                const task = tasks.find((t) => t.id === item.task_id);
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.name}</div>
                        {item.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {item.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.category || "Other"}</Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(item.date), "dd.MM.yyyy")}
                    </TableCell>
                    <TableCell>
                      {task ? (
                        <span className="text-sm text-muted-foreground">
                          {task.title}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.amount)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(item.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={4} className="font-semibold">
                Celkové náklady
              </TableCell>
              <TableCell className="text-right font-semibold">
                {formatCurrency(totalCost)}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  );
}
