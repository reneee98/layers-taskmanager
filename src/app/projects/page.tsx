"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { usePermission } from "@/hooks/usePermissions";
import { AlertTriangle } from "lucide-react";
import { Plus, MoreHorizontal, Pencil, Trash2, Circle, Play, Eye, CheckCircle, XCircle, Pause, Send, ChevronDown, Check, Archive, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import dynamic from "next/dynamic";

// Lazy load ProjectForm
const ProjectForm = dynamic(() => import("@/components/projects/ProjectForm").then(mod => ({ default: mod.ProjectForm })), {
  loading: () => null,
  ssr: false,
});
import type { Project, Client } from "@/types/database";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; icon: any; color: string; iconColor: string }> = {
  draft: { 
    label: "Návrh", 
    icon: Circle, 
    color: "bg-slate-100 text-slate-700 border-slate-200", 
    iconColor: "text-slate-500" 
  },
  active: { 
    label: "Aktívny", 
    icon: Play, 
    color: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800", 
    iconColor: "text-blue-500" 
  },
  on_hold: { 
    label: "Pozastavený", 
    icon: Pause, 
    color: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800", 
    iconColor: "text-amber-500" 
  },
  sent_to_client: { 
    label: "Sent to Client", 
    icon: Send, 
    color: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800", 
    iconColor: "text-purple-500" 
  },
  completed: { 
    label: "Dokončený", 
    icon: CheckCircle, 
    color: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800", 
    iconColor: "text-emerald-500" 
  },
  cancelled: { 
    label: "Zrušený", 
    icon: XCircle, 
    color: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800", 
    iconColor: "text-red-500" 
  },
};

function ProjectsPageContent() {
  const router = useRouter();
  const { hasPermission: canViewProjects, isLoading: isLoadingPermission } = usePermission('pages', 'view_projects');
  const [projects, setProjects] = useState<Project[]>([]);
  const [archivedProjects, setArchivedProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (clientFilter !== "all") params.append("client_id", clientFilter);

      // Fetch active projects (exclude completed and cancelled)
      const activeParams = new URLSearchParams(params);
      activeParams.append("exclude_status", "completed,cancelled");
      
      const [activeResponse, archivedResponse] = await Promise.all([
        fetch(`/api/projects?${activeParams}`),
        // Fetch archived projects - same as invoices: projects with invoiced tasks
        fetch(`/api/projects?status=completed,cancelled`)
      ]);

      const activeResult = await activeResponse.json();
      const archivedResult = await archivedResponse.json();

      if (activeResult.success) {
        setProjects(activeResult.data);
      }
      if (archivedResult.success) {
        console.log('[Projects Page] Archived projects received:', archivedResult.data);
        setArchivedProjects(archivedResult.data);
      } else {
        console.error('[Projects Page] Error loading archived projects:', archivedResult);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa načítať projekty",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, clientFilter]);

  const fetchClients = async () => {
    const response = await fetch("/api/clients");
    const result = await response.json();
    if (result.success) {
      setClients(result.data);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchClients();
  }, [fetchProjects]);

  // Refresh projects when window gains focus (e.g., after marking invoice as archived)
  useEffect(() => {
    const handleFocus = () => {
      fetchProjects();
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchProjects]);

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setIsFormOpen(true);
  };

  const handleDeleteProject = async (projectId: string) => {
    // Check if this is a personal project (only by name, not by missing code)
    const project = projects.find(p => p.id === projectId) || archivedProjects.find(p => p.id === projectId);
    const isPersonalProject = project && project.name === "Osobné úlohy";
    
    if (isPersonalProject) {
      toast({
        title: "Chyba",
        description: "Nie je možné odstrániť osobný projekt",
        variant: "destructive",
      });
      return;
    }

    if (!confirm("Naozaj chcete vymazať tento projekt?")) return;

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (result.success) {
        toast({
          title: "Úspech",
          description: "Projekt bol vymazaný",
        });
        fetchProjects();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: "Chyba",
        description: error.message || "Nepodarilo sa vymazať projekt",
        variant: "destructive",
      });
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingProject(null);
  };

  const handleFormSuccess = () => {
    fetchProjects();
    handleFormClose();
  };

  const handleCompleteProject = async (projectId: string) => {
    // Check if this is a personal project (only by name)
    const project = projects.find(p => p.id === projectId);
    const isPersonalProject = project && project.name === "Osobné úlohy";
    
    if (isPersonalProject) {
      toast({
        title: "Chyba",
        description: "Nie je možné meniť status osobného projektu",
        variant: "destructive",
      });
      return;
    }

    if (!confirm("Naozaj chcete označiť tento projekt ako dokončený?")) return;

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" })
      });
      const result = await response.json();

      if (result.success) {
        toast({
          title: "Úspech",
          description: "Projekt bol označený ako dokončený",
        });
        fetchProjects();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: "Chyba",
        description: error.message || "Nepodarilo sa označiť projekt ako dokončený",
        variant: "destructive",
      });
    }
  };

  const handleReactivateProject = async (projectId: string) => {
    // Check if this is a personal project (only by name)
    const project = archivedProjects.find(p => p.id === projectId) || projects.find(p => p.id === projectId);
    const isPersonalProject = project && project.name === "Osobné úlohy";
    
    if (isPersonalProject) {
      toast({
        title: "Chyba",
        description: "Nie je možné meniť status osobného projektu",
        variant: "destructive",
      });
      return;
    }

    if (!confirm("Naozaj chcete reaktivovať tento projekt?")) return;

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" })
      });
      const result = await response.json();

      if (result.success) {
        toast({
          title: "Úspech",
          description: "Projekt bol reaktivovaný",
        });
        fetchProjects();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: "Chyba",
        description: error.message || "Nepodarilo sa reaktivovať projekt",
        variant: "destructive",
      });
    }
  };

  // Check permission
  if (isLoadingPermission) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="text-muted-foreground">Kontrolujem oprávnenia...</p>
        </div>
      </div>
    );
  }

  if (!canViewProjects) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center space-y-4 text-center">
          <AlertTriangle className="h-12 w-12 text-muted-foreground" />
          <h2 className="text-xl font-semibold text-foreground">Nemáte oprávnenie</h2>
          <p className="text-muted-foreground max-w-md">
            Nemáte oprávnenie na zobrazenie projektov. Kontaktujte administrátora workspace.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Projekty</h1>
          <p className="text-muted-foreground mt-1">Spravujte svoje projekty</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Tabs */}
          <div className="flex items-center bg-muted rounded-lg p-1">
            <Button
              variant={!showArchived ? "default" : "ghost"}
              size="sm"
              onClick={() => setShowArchived(false)}
              className={!showArchived ? "bg-gray-900 text-white hover:bg-gray-800 shadow-sm" : "hover:bg-accent text-muted-foreground"}
            >
              <FolderOpen className="h-4 w-4 mr-2" />
              Aktívne ({projects.length})
            </Button>
            <Button
              variant={showArchived ? "default" : "ghost"}
              size="sm"
              onClick={() => setShowArchived(true)}
              className={showArchived ? "bg-gray-900 text-white hover:bg-gray-800 shadow-sm" : "hover:bg-accent text-muted-foreground"}
            >
              <Archive className="h-4 w-4 mr-2" />
              Archivované ({archivedProjects.length})
            </Button>
          </div>
          
          <Button 
            onClick={() => setIsFormOpen(true)}
            className="bg-gray-900 text-white hover:bg-gray-800"
          >
            <Plus className="mr-2 h-4 w-4" />
            Pridať projekt
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-[200px] bg-card border-border justify-between">
              {statusFilter === "all" ? "Všetky statusy" : statusConfig[statusFilter]?.label || "Všetky statusy"}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[200px]">
            <DropdownMenuItem 
              onClick={() => setStatusFilter("all")}
              className="flex items-center gap-2"
            >
              <Check className="h-4 w-4" />
              Všetky statusy
            </DropdownMenuItem>
            {Object.entries(statusConfig).map(([key, config]) => {
              const IconComponent = config.icon;
              return (
                <DropdownMenuItem 
                  key={key} 
                  onClick={() => setStatusFilter(key)}
                  className="flex items-center gap-2"
                >
                  <IconComponent className={cn("h-4 w-4", config.iconColor)} />
                  {config.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-[200px] bg-card border-border">
            <SelectValue placeholder="Všetci klienti" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všetci klienti</SelectItem>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Projects Table */}
      <div className="bg-card border border-border rounded-lg shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted">
              <TableHead className="text-muted-foreground font-semibold">Kód</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Názov</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Klient</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  Načítavam...
                </TableCell>
              </TableRow>
            ) : (showArchived ? archivedProjects : projects).length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                      {showArchived ? <Archive className="h-6 w-6 text-muted-foreground" /> : <Plus className="h-6 w-6 text-muted-foreground" />}
                    </div>
                    <p className="text-lg font-medium">
                      {showArchived ? "Žiadne archivované projekty" : "Žiadne projekty"}
                    </p>
                    <p className="text-sm">
                      {showArchived ? "Dokončte nejaký projekt a objaví sa tu" : "Začnite vytvorením nového projektu"}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              (showArchived ? archivedProjects : projects).map((project) => {
                const isPersonalProject = project.name === "Osobné úlohy" || 
                  (project.code && (project.code === "PERSONAL" || project.code.startsWith("PERSONAL-"))) ||
                  !project.code;
                
                return (
                <TableRow
                  key={project.id}
                  className="cursor-pointer group hover:bg-muted/50 transition-colors"
                  onClick={() => router.push(`/projects/${project.id}`)}
                >
                    {!isPersonalProject ? (
                  <TableCell className="font-mono text-foreground">{project.code}</TableCell>
                    ) : (
                      <TableCell className="text-muted-foreground italic">—</TableCell>
                    )}
                  <TableCell className="font-medium text-foreground">{project.name}</TableCell>
                    {!isPersonalProject ? (
                  <TableCell className="text-muted-foreground">{project.client?.name || 'Neznámy klient'}</TableCell>
                    ) : (
                      <TableCell className="text-muted-foreground italic">—</TableCell>
                    )}
                    {!isPersonalProject ? (
                  <TableCell className="p-3">
                    {(() => {
                      const config = statusConfig[project.status] || statusConfig.draft;
                      const IconComponent = config.icon;
                      return (
                        <div className={cn("text-xs flex items-center gap-1.5 px-2 py-1 rounded-full border w-fit whitespace-nowrap", config.color)}>
                          <IconComponent className={cn("h-3 w-3 flex-shrink-0", config.iconColor, project.status === 'active' && "animate-pulse")} />
                          <span className="flex-shrink-0">{config.label}</span>
                        </div>
                      );
                    })()}
                  </TableCell>
                    ) : (
                      <TableCell className="text-muted-foreground italic">—</TableCell>
                    )}
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        {!isPersonalProject && (
                              <>
                                {!showArchived && project.status !== 'completed' && (
                                  <DropdownMenuItem 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCompleteProject(project.id);
                                    }}
                                    className="text-green-600 focus:text-green-600"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Označiť ako dokončený
                                  </DropdownMenuItem>
                                )}
                                {showArchived && project.status === 'completed' && (
                                  <DropdownMenuItem 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleReactivateProject(project.id);
                                    }}
                                    className="text-blue-600 focus:text-blue-600"
                                  >
                                    <Play className="h-4 w-4 mr-2" />
                                    Reaktivovať
                                  </DropdownMenuItem>
                                )}
                              </>
                        )}
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditProject(project);
                          }}
                          className="text-foreground"
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Upraviť
                        </DropdownMenuItem>
                        {!isPersonalProject && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteProject(project.id);
                                  }}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Vymazať
                                </DropdownMenuItem>
                              </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <ProjectForm
        open={isFormOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleFormClose();
          }
        }}
        project={editingProject || undefined}
        clients={clients}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <AuthGuard>
      <ProjectsPageContent />
    </AuthGuard>
  );
}

