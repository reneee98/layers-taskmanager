"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
} from "@/components/ui/table";
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Loader2,
  Shield,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { getRoleDisplayName } from "@/lib/role-utils";

interface Role {
  id: string;
  name: string;
  description: string | null;
  is_system_role: boolean;
  created_at: string;
  updated_at: string;
}

interface Permission {
  id: string;
  name: string;
  description: string | null;
  resource: string;
  action: string;
  created_at: string;
  updated_at: string;
}

export function RolesManager() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Form states
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  const fetchRoles = async () => {
    try {
      const response = await fetch("/api/admin/roles");
      const result = await response.json();

      if (result.success) {
        // Filter out 'user' role if it still exists in database
        const filteredRoles = result.data.filter((role: Role) => role.name !== 'user');
        setRoles(filteredRoles);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error fetching roles:", error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa načítať role",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await fetch("/api/admin/permissions");
      const result = await response.json();

      if (result.success) {
        setPermissions(result.data);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error fetching permissions:", error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa načítať oprávnenia",
        variant: "destructive",
      });
    }
  };

  const fetchRolePermissions = async (roleId: string) => {
    try {
      const response = await fetch(`/api/admin/roles/${roleId}/permissions`);
      const result = await response.json();

      if (result.success) {
        setSelectedPermissions(new Set(result.data.map((p: Permission) => p.id)));
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error fetching role permissions:", error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa načítať oprávnenia role",
        variant: "destructive",
      });
    }
  };

  const handleCreateRole = async () => {
    if (!roleName.trim()) {
      toast({
        title: "Chyba",
        description: "Názov role je povinný",
        variant: "destructive",
      });
      return;
    }

    setActionLoading("create");
    try {
      const response = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: roleName.trim(),
          description: roleDescription.trim() || null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Úspech",
          description: "Role bola vytvorená",
        });
        setIsCreateDialogOpen(false);
        setRoleName("");
        setRoleDescription("");
        fetchRoles();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error("Error creating role:", error);
      toast({
        title: "Chyba",
        description: error.message || "Nepodarilo sa vytvoriť role",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditRole = async () => {
    if (!selectedRole || !roleName.trim()) {
      toast({
        title: "Chyba",
        description: "Názov role je povinný",
        variant: "destructive",
      });
      return;
    }

    setActionLoading("edit");
    try {
      const response = await fetch(`/api/admin/roles/${selectedRole.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: roleName.trim(),
          description: roleDescription.trim() || null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Úspech",
          description: "Role bola aktualizovaná",
        });
        setIsEditDialogOpen(false);
        setSelectedRole(null);
        setRoleName("");
        setRoleDescription("");
        fetchRoles();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error("Error updating role:", error);
      toast({
        title: "Chyba",
        description: error.message || "Nepodarilo sa aktualizovať role",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm("Naozaj chcete vymazať túto role?")) {
      return;
    }

    setActionLoading(roleId);
    try {
      const response = await fetch(`/api/admin/roles/${roleId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Úspech",
          description: "Role bola vymazaná",
        });
        fetchRoles();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error("Error deleting role:", error);
      toast({
        title: "Chyba",
        description: error.message || "Nepodarilo sa vymazať role",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenEditDialog = (role: Role) => {
    setSelectedRole(role);
    setRoleName(role.name);
    setRoleDescription(role.description || "");
    setIsEditDialogOpen(true);
  };

  const handleOpenPermissionsDialog = async (role: Role) => {
    setSelectedRole(role);
    await fetchRolePermissions(role.id);
    setIsPermissionsDialogOpen(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;

    setActionLoading("permissions");
    try {
      const response = await fetch(`/api/admin/roles/${selectedRole.id}/permissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          permission_ids: Array.from(selectedPermissions),
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Úspech",
          description: "Oprávnenia boli aktualizované",
        });
        setIsPermissionsDialogOpen(false);
        setSelectedRole(null);
        setSelectedPermissions(new Set());
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error("Error saving permissions:", error);
      toast({
        title: "Chyba",
        description: error.message || "Nepodarilo sa uložiť oprávnenia",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const togglePermission = (permissionId: string) => {
    const newSet = new Set(selectedPermissions);
    if (newSet.has(permissionId)) {
      newSet.delete(permissionId);
    } else {
      newSet.add(permissionId);
    }
    setSelectedPermissions(newSet);
  };

  // Group permissions by page/functionality instead of resource
  // Each permission appears only once in the most relevant section
  const permissionsByPage: Record<string, { title: string; description?: string; permissions: Permission[] }> = {
    dashboard: {
      title: 'Dashboard',
      description: 'Prístup k hlavnej stránke a prehľadu',
      permissions: permissions.filter(p => p.name === 'pages.view_dashboard')
    },
    projects: {
      title: 'Projekty',
      description: 'Správa projektov a ich finančných údajov',
      permissions: permissions.filter(p => 
        p.name === 'pages.view_projects' ||
        (p.resource === 'projects') ||
        (p.resource === 'financial' && ['view_prices', 'view_hourly_rates', 'view_reports', 'view_profit', 'view_costs'].includes(p.action))
      )
    },
    tasks: {
      title: 'Úlohy',
      description: 'Správa úloh a komentárov',
      permissions: permissions.filter(p => 
        p.name === 'pages.view_tasks' ||
        (p.resource === 'tasks') ||
        (p.resource === 'comments')
      )
    },
    clients: {
      title: 'Klienti',
      description: 'Správa klientov',
      permissions: permissions.filter(p => 
        p.name === 'pages.view_clients' ||
        p.resource === 'clients'
      )
    },
    timeEntries: {
      title: 'Časové záznamy',
      description: 'Prehľad a správa časových záznamov',
      permissions: permissions.filter(p => 
        p.name === 'pages.view_time_entries' ||
        p.resource === 'time_entries'
      )
    },
    invoices: {
      title: 'Faktúry',
      description: 'Správa faktúr a fakturačných údajov',
      permissions: permissions.filter(p => 
        p.name === 'pages.view_invoices' ||
        p.resource === 'invoices' ||
        p.name === 'financial.view_invoices'
      )
    },
    settings: {
      title: 'Nastavenia',
      description: 'Nastavenia workspace',
      permissions: permissions.filter(p => 
        p.name === 'pages.view_settings' ||
        (p.resource === 'workspace' && p.action !== 'manage_members')
      )
    },
    workspaceUsers: {
      title: 'Správa používateľov',
      description: 'Správa členov workspace',
      permissions: permissions.filter(p => 
        p.name === 'pages.view_workspace_users' ||
        p.resource === 'users' ||
        p.name === 'workspace.manage_members'
      )
    },
    admin: {
      title: 'Administrácia',
      description: 'Správa rolí, oprávnení a bug reportov',
      permissions: permissions.filter(p => 
        p.name === 'pages.view_admin_roles' ||
        p.name === 'pages.view_admin_bugs' ||
        p.resource === 'roles' ||
        p.resource === 'permissions'
      )
    }
  };

  // Function to get Slovak role name

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create Role Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Vytvoriť novú role
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vytvoriť novú role</DialogTitle>
            <DialogDescription>
              Vytvorte novú role a nastavte jej oprávnenia
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="role-name">Názov role *</Label>
              <Input
                id="role-name"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                placeholder="napr. Designer, Manager"
              />
            </div>
            <div>
              <Label htmlFor="role-description">Popis</Label>
              <Textarea
                id="role-description"
                value={roleDescription}
                onChange={(e) => setRoleDescription(e.target.value)}
                placeholder="Popis role a jej účelu"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setRoleName("");
                setRoleDescription("");
              }}
            >
              Zrušiť
            </Button>
            <Button onClick={handleCreateRole} disabled={actionLoading === "create"}>
              {actionLoading === "create" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Vytvoriť
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upraviť role</DialogTitle>
            <DialogDescription>
              Upravte názov a popis role
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-role-name">Názov role *</Label>
              <Input
                id="edit-role-name"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                placeholder="napr. Designer, Manager"
              />
            </div>
            <div>
              <Label htmlFor="edit-role-description">Popis</Label>
              <Textarea
                id="edit-role-description"
                value={roleDescription}
                onChange={(e) => setRoleDescription(e.target.value)}
                placeholder="Popis role a jej účelu"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setSelectedRole(null);
                setRoleName("");
                setRoleDescription("");
              }}
            >
              Zrušiť
            </Button>
            <Button onClick={handleEditRole} disabled={actionLoading === "edit"}>
              {actionLoading === "edit" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Uložiť
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={isPermissionsDialogOpen} onOpenChange={setIsPermissionsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Oprávnenia pre role: {selectedRole ? (selectedRole.is_system_role ? getRoleDisplayName(selectedRole.name) : selectedRole.name) : ''}
            </DialogTitle>
            <DialogDescription>
              Vyberte oprávnenia, ktoré má mať táto role
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {Object.entries(permissionsByPage)
              .filter(([_, page]) => page.permissions.length > 0)
              .map(([pageKey, page]) => {
                // Translate action names to Slovak
                const getActionLabel = (action: string, resource: string) => {
                  switch (action) {
                    case 'create': return 'Vytvárať';
                    case 'read': return 'Čítať';
                    case 'update': return 'Upravovať';
                    case 'delete': return 'Mazať';
                    case 'manage': return 'Spravovať';
                    case 'manage_members': return 'Spravovať členov';
                    case 'view_prices': return 'Zobraziť ceny';
                    case 'view_hourly_rates': return 'Zobraziť hodinové sadzby';
                    case 'view_reports': return 'Zobraziť reporty';
                    case 'view_profit': return 'Zobraziť zisk/stratu';
                    case 'view_costs': return 'Zobraziť náklady';
                    case 'view_invoices': return 'Zobraziť faktúry';
                    case 'view_dashboard': return 'Zobraziť dashboard';
                    case 'view_projects': return 'Zobraziť stránku projektov';
                    case 'view_clients': return 'Zobraziť stránku klientov';
                    case 'view_tasks': return 'Zobraziť stránku úloh';
                    case 'view_time_entries': return 'Zobraziť stránku časových záznamov';
                    case 'view_settings': return 'Zobraziť nastavenia';
                    case 'view_workspace_users': return 'Zobraziť správu používateľov';
                    case 'view_admin_roles': return 'Zobraziť správu rolí';
                    case 'view_admin_bugs': return 'Zobraziť bug reporty';
                    default: return action;
                  }
                };

                // Get resource label for better context
                const getResourceContext = (resource: string) => {
                  switch (resource) {
                    case 'projects': return 'projekty';
                    case 'tasks': return 'úlohy';
                    case 'time_entries': return 'časové záznamy';
                    case 'invoices': return 'faktúry';
                    case 'clients': return 'klientov';
                    case 'workspace': return 'workspace';
                    case 'users': return 'používateľov';
                    case 'roles': return 'role';
                    case 'permissions': return 'oprávnenia';
                    case 'financial': return 'finančné údaje';
                    case 'pages': return '';
                    case 'comments': return 'komentáre';
                    default: return resource;
                  }
                };

                // Sort permissions: page access first, then CRUD operations
                const sortedPermissions = [...page.permissions].sort((a, b) => {
                  // Page permissions first
                  if (a.resource === 'pages' && b.resource !== 'pages') return -1;
                  if (a.resource !== 'pages' && b.resource === 'pages') return 1;
                  
                  // Then by action order: read, create, update, delete, manage
                  const actionOrder: Record<string, number> = {
                    'read': 1,
                    'create': 2,
                    'update': 3,
                    'delete': 4,
                    'manage': 5,
                    'view_dashboard': 0,
                    'view_projects': 0,
                    'view_clients': 0,
                    'view_tasks': 0,
                    'view_time_entries': 0,
                    'view_invoices': 0,
                    'view_settings': 0,
                    'view_workspace_users': 0,
                    'view_admin_roles': 0,
                    'view_admin_bugs': 0,
                  };
                  
                  const aOrder = actionOrder[a.action] || 99;
                  const bOrder = actionOrder[b.action] || 99;
                  return aOrder - bOrder;
                });
              
                return (
                  <div key={pageKey} className="space-y-3 border-b pb-4 last:border-b-0">
                    <div>
                      <h4 className="font-semibold text-base">{page.title}</h4>
                      {page.description && (
                        <p className="text-xs text-muted-foreground mt-1">{page.description}</p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {sortedPermissions.map((perm) => {
                        const resourceContext = getResourceContext(perm.resource);
                        const actionLabel = getActionLabel(perm.action, perm.resource);
                        const displayLabel = resourceContext 
                          ? `${actionLabel} ${resourceContext}`
                          : actionLabel;
                        
                        return (
                          <div key={perm.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`perm-${perm.id}`}
                              checked={selectedPermissions.has(perm.id)}
                              onCheckedChange={() => togglePermission(perm.id)}
                            />
                            <Label
                              htmlFor={`perm-${perm.id}`}
                              className="text-sm font-normal cursor-pointer"
                            >
                              {displayLabel}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsPermissionsDialogOpen(false);
                setSelectedRole(null);
                setSelectedPermissions(new Set());
              }}
            >
              Zrušiť
            </Button>
            <Button onClick={handleSavePermissions} disabled={actionLoading === "permissions"}>
              {actionLoading === "permissions" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Uložiť oprávnenia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Roles Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Názov</TableHead>
              <TableHead>Popis</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead className="text-right">Akcie</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Žiadne role
                </TableCell>
              </TableRow>
            ) : (
              roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">
                    {role.is_system_role ? getRoleDisplayName(role.name) : role.name}
                  </TableCell>
                  <TableCell>{role.description || "—"}</TableCell>
                  <TableCell>
                    {role.is_system_role ? (
                      <Badge variant="secondary">Systémová</Badge>
                    ) : (
                      <Badge variant="outline">Vlastná</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenPermissionsDialog(role)}
                      >
                        <Shield className="h-4 w-4 mr-1" />
                        Oprávnenia
                      </Button>
                      {!role.is_system_role && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditDialog(role)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteRole(role.id)}
                            disabled={actionLoading === role.id}
                          >
                            {actionLoading === role.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-destructive" />
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

