"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, 
  Clock, 
  Archive,
  Euro,
  Calendar,
  CheckCircle,
  ListChecks,
  ReceiptText,
} from "lucide-react";
import { formatCurrency, formatHours } from "@/lib/format";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getTaskStatusLabel } from "@/lib/task-status";
import { usePermission } from "@/hooks/usePermissions";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { PageHeader } from "@/components/layout/page-header";
import { PageState } from "@/components/layout/page-state";
import { MetricStrip } from "@/components/layout/metric-strip";
import { DataToolbar } from "@/components/layout/data-toolbar";

interface Project {
  id: string;
  name: string;
  code: string;
  status: string;
  client: {
    id: string;
    name: string;
  };
  tasks: Task[];
  done_tasks: Task[];
  labor_cost: number;
  external_cost: number;
  fixed_budget_cost: number;
  total_cost: number;
  task_count: number;
  created_at: string;
  updated_at: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  estimated_hours: number | null;
  actual_hours: number | null;
  budget_cents: number | null;
  due_date: string | null;
  project: {
    id: string;
    name: string;
    code: string;
    client: {
      id: string;
      name: string;
    };
  };
  assignees: Array<{
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  labor_cost: number;
  external_cost: number;
  fixed_budget_cost: number;
  total_cost: number;
  created_at: string;
  updated_at: string;
}

export default function InvoicesPage() {
  const { hasPermission: canViewInvoices, isLoading: isLoadingInvoices } = usePermission('financial', 'view_invoices');
  const { hasPermission: canViewPrices } = usePermission('financial', 'view_prices');
  const { workspaceRole } = useWorkspace();
  const isOwner = workspaceRole?.role === 'owner';
  const [readyProjects, setReadyProjects] = useState<Project[]>([]);
  const [readyTasks, setReadyTasks] = useState<Task[]>([]);
  const [archivedProjects, setArchivedProjects] = useState<Project[]>([]);
  const [archivedTasks, setArchivedTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("projects");

  // Owners have all permissions automatically
  const canAccess = isOwner || canViewInvoices;

  useEffect(() => {
    // Only fetch if user has permission (or is owner)
    if (canAccess && !isLoadingInvoices) {
      // Load both tabs data in parallel on initial load
      Promise.all([
        fetch("/api/invoices/ready").then(r => r.json()),
        fetch("/api/invoices/archived").then(r => r.json())
      ]).then(([readyResult, archivedResult]) => {
        if (readyResult.success) {
          setReadyProjects(readyResult.data.projects || []);
          setReadyTasks(readyResult.data.tasks || []);
        }
        if (archivedResult.success) {
          setArchivedProjects(archivedResult.data.projects || []);
          setArchivedTasks(archivedResult.data.tasks || []);
        }
        setIsLoading(false);
      }).catch(() => {
        setIsLoading(false);
        toast({
          title: "Chyba",
          description: "Nepodarilo sa načítať dáta",
          variant: "destructive",
        });
      });
    }
  }, [canAccess, isLoadingInvoices]);

  useEffect(() => {
    // Load data when tab changes - only if user has access
    if (canAccess && !isLoadingInvoices) {
      if (activeTab === "projects") {
        fetchInvoiceData();
      } else if (activeTab === "archived") {
        fetchArchivedData();
      }
    }
  }, [activeTab, canAccess, isLoadingInvoices]);

  const fetchInvoiceData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/invoices/ready");
      const result = await response.json();

      if (result.success) {
        setReadyProjects(result.data.projects || []);
        setReadyTasks(result.data.tasks || []);
      } else {
        toast({
          title: "Chyba",
          description: result.error || "Nepodarilo sa načítať dáta pre faktúry",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa načítať dáta pre faktúry",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchArchivedData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/invoices/archived");
      const result = await response.json();

      if (result.success) {
        setArchivedProjects(result.data.projects || []);
        setArchivedTasks(result.data.tasks || []);
      } else {
        toast({
          title: "Chyba",
          description: result.error || "Nepodarilo sa načítať archivované dáta",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa načítať archivované dáta",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsInvoiced = async (type: 'project' | 'task', id: string) => {
    try {
      const response = await fetch("/api/invoices/mark-invoiced", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type,
          id,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Úspech",
          description: `${type === 'project' ? 'Projekt' : 'Úloha'} bola označená ako vyfaktúrovaná`,
        });
        // Refresh data based on active tab
        if (activeTab === "projects") {
          fetchInvoiceData();
        } else {
          fetchArchivedData();
        }
      } else {
        toast({
          title: "Chyba",
          description: result.error || "Nepodarilo sa označiť ako vyfaktúrované",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error marking as invoiced:", error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa označiť ako vyfaktúrované",
        variant: "destructive",
      });
    }
  };

  const handleRestore = async (type: 'project' | 'task', id: string) => {
    try {
      const response = await fetch("/api/invoices/restore", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type,
          id,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Úspech",
          description: `${type === 'project' ? 'Projekt' : 'Úloha'} bola obnovená`,
        });
        // Refresh data based on active tab
        if (activeTab === "projects") {
          fetchInvoiceData();
        } else {
          fetchArchivedData();
        }
      } else {
        toast({
          title: "Chyba",
          description: result.error || "Nepodarilo sa obnoviť",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error restoring:", error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa obnoviť",
        variant: "destructive",
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    const variantMap: { [key: string]: string } = {
      'todo': 'bg-muted text-muted-foreground border-border',
      'in_progress': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      'review': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      'done': 'bg-green-500/10 text-green-500 border-green-500/20',
      'invoiced': 'bg-teal-500/10 text-teal-600 border-teal-500/20',
      'cancelled': 'bg-red-500/10 text-red-500 border-red-500/20'
    };
    return variantMap[status] || 'bg-muted text-muted-foreground border-border';
  };

  const getStatusText = (status: string) => {
    const projectStatusLabels: Record<string, string> = {
      draft: "Návrh",
      active: "Aktívny",
      on_hold: "Pozastavený",
      sent_to_client: "Odoslaný klientovi",
      completed: "Dokončený",
      cancelled: "Zrušený",
    };

    return projectStatusLabels[status] || getTaskStatusLabel(status) || status;
  };

  const getPriorityBadgeVariant = (priority: string) => {
    const variantMap: { [key: string]: string } = {
      'low': 'bg-green-500/10 text-green-500 border-green-500/20',
      'medium': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      'high': 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      'urgent': 'bg-red-500/10 text-red-500 border-red-500/20'
    };
    return variantMap[priority] || 'bg-muted text-muted-foreground border-border';
  };

  const getPriorityText = (priority: string) => {
    const priorityMap: { [key: string]: string } = {
      'low': 'Nízka',
      'medium': 'Stredná',
      'high': 'Vysoká',
      'urgent': 'Urgentná'
    };
    return priorityMap[priority] || priority;
  };

  if (isLoadingInvoices) {
    return <PageState variant="loading" title="Kontrolujem oprávnenia" />;
  }

  if (!canAccess) {
    return (
      <PageState
        variant="permission"
        title="Nemáte prístup k fakturácii"
        description="Finančné údaje môže sprístupniť vlastník alebo administrátor workspace."
      />
    );
  }

  if (isLoading) {
    return <PageState variant="loading" title="Načítavam fakturáciu" />;
  }

  const currentProjects = activeTab === "projects" ? readyProjects : archivedProjects;
  const currentTasks = activeTab === "projects" ? readyTasks : archivedTasks;
  const totalProjectsValue = currentProjects.reduce((sum, project) => sum + project.total_cost, 0);
  const totalTasksValue = currentTasks.reduce((sum, task) => sum + task.total_cost, 0);
  const totalValue = totalProjectsValue + totalTasksValue;

  return (
    <div className="page-shell">
      <PageHeader
        title="Fakturácia"
        description="Dokončená práca pripravená na fakturáciu a história vybavených položiek."
        icon={ReceiptText}
      />

      <MetricStrip
        items={[
          {
            label: activeTab === "projects" ? "Pripravené projekty" : "Archivované projekty",
            value: currentProjects.length,
            icon: activeTab === "projects" ? FileText : Archive,
          },
          {
            label: "Samostatné úlohy",
            value: currentTasks.length,
            icon: ListChecks,
          },
          {
            label: activeTab === "projects" ? "Na vyfaktúrovanie" : "Vyfaktúrovaná hodnota",
            value: canViewPrices ? formatCurrency(totalValue) : "—",
            icon: Euro,
            tone: "text-emerald-600 dark:text-emerald-400",
          },
        ]}
      />

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <DataToolbar>
          <TabsList className="h-9 bg-background">
            <TabsTrigger value="projects">
              Na fakturáciu ({readyProjects.length})
            </TabsTrigger>
            <TabsTrigger value="archived">
              Archív ({archivedProjects.length})
            </TabsTrigger>
          </TabsList>
          <p className="px-1 text-xs text-muted-foreground">
            {activeTab === "projects" ? "Dokončené a ešte nevyfaktúrované" : "Už spracované položky"}
          </p>
        </DataToolbar>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-4">
          {readyProjects.length === 0 ? (
            <PageState
              compact
              icon={ReceiptText}
              title="Všetko je spracované"
              description="Keď dokončíte projekt, objaví sa tu pripravený na fakturáciu."
            />
          ) : (
            <div className="space-y-4">
              {readyProjects.map((project) => (
                <Card key={project.id} className="overflow-hidden">
                  <CardHeader className="border-b border-border bg-muted/[0.22] px-5 py-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-foreground">{project.name}</h3>
                          <Badge variant="outline" className="font-mono bg-muted text-foreground border-border">
                            {project.code}
                          </Badge>
                          <Badge variant="outline" className={cn("text-xs", getStatusBadgeVariant(project.status))}>
                            {getStatusText(project.status)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {project.client?.name || 'Bez klienta'} · {project.task_count} dokončených úloh
                        </p>
                      </div>
                      {canViewPrices && (
                        <div className="text-right">
                          <div className="text-xl font-semibold tabular-nums text-foreground">
                            {formatCurrency(project.total_cost)}
                          </div>
                          <div className="mt-1 max-w-xs text-xs text-muted-foreground">
                            {project.labor_cost > 0 && `${formatCurrency(project.labor_cost)} (čas) `}
                            {project.fixed_budget_cost > 0 && `${formatCurrency(project.fixed_budget_cost)} (fixná) `}
                            {project.external_cost > 0 && `${formatCurrency(project.external_cost)} (náklady)`}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-5">
                    {/* Done tasks details */}
                    {project.done_tasks && project.done_tasks.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium mb-2">Dokončené úlohy:</h4>
                        <div className="space-y-2">
                          {project.done_tasks.map((task: any) => (
                            <div key={task.id} className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/[0.18] px-3 py-2">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-medium">{task.title}</span>
                                <Badge variant="outline" className={getPriorityBadgeVariant(task.priority)}>
                                  {getPriorityText(task.priority)}
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {task.estimated_hours && task.estimated_hours > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatHours(task.estimated_hours)}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Dokončené: {format(new Date(project.updated_at), 'dd.MM.yyyy', { locale: sk })}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/projects/${project.id}`}>
                            Zobraziť projekt
                          </Link>
                        </Button>
                        {activeTab === "projects" ? (
                          <Button 
                            size="sm"
                            onClick={() => handleMarkAsInvoiced('project', project.id)}
                          >
                            Označiť ako vyfaktúrované
                          </Button>
                        ) : (
                          <Button 
                            size="sm"
                            variant="outline"
                            onClick={() => handleRestore('project', project.id)}
                          >
                            Obnoviť
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Archived Tab */}
        <TabsContent value="archived" className="space-y-4">
          {archivedProjects.length === 0 ? (
            <PageState
              compact
              icon={Archive}
              title="Archív je prázdny"
              description="Vyfaktúrované projekty sa zobrazia na tomto mieste."
            />
          ) : (
            <div className="space-y-4">
              {archivedProjects.map((project) => (
                <Card key={project.id} className="overflow-hidden">
                  <CardHeader className="border-b border-border bg-muted/[0.18] px-5 py-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold">{project.name}</h3>
                          <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
                            {project.code}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          <strong>Klient:</strong> {project.client?.name || 'Bez klienta'} • <strong>Úlohy:</strong> {project.task_count}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {(project as any).invoiced_at && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Vyfaktúrované: {format(new Date((project as any).invoiced_at), 'dd.MM.yyyy', { locale: sk })}
                            </span>
                          )}
                        </div>
                      </div>
                      {canViewPrices && (
                        <div className="text-right">
                          <div className="text-xl font-semibold tabular-nums text-foreground">
                            {formatCurrency(project.total_cost)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {project.labor_cost > 0 && `${formatCurrency(project.labor_cost)} (čas) `}
                            {project.fixed_budget_cost > 0 && `${formatCurrency(project.fixed_budget_cost)} (fixná) `}
                            {project.external_cost > 0 && `${formatCurrency(project.external_cost)} (náklady)`}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-5">
                    {/* Done tasks details */}
                    {project.tasks && project.tasks.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium mb-2">Vyfaktúrované úlohy:</h4>
                        <div className="space-y-2">
                          {project.tasks.map((task: any) => (
                            <div key={task.id} className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/[0.18] px-3 py-2">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-medium">{task.title}</span>
                                <Badge variant="outline" className={getPriorityBadgeVariant(task.priority)}>
                                  {getPriorityText(task.priority)}
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {task.budget_cents && task.budget_cents > 0 && canViewPrices && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatCurrency((task.budget_cents || 0) / 100)}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/projects/${project.id}`}>
                          Zobraziť projekt
                        </Link>
                      </Button>
                      <Button 
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestore('project', project.id)}
                      >
                        Obnoviť
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
