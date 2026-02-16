"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Users,
  Plus,
  Edit,
  Trash2,
  Mail,
  Crown,
  Shield,
  User,
  AlertTriangle,
  Settings2,
} from "lucide-react";
import { DashboardPermissionsDialog } from "@/components/dashboard/DashboardPermissionsDialog";
import { getRoleLabel, getRoleDisplayName } from "@/lib/role-utils";
import { toast } from "@/hooks/use-toast";

interface WorkspaceUser {
  user_id: string;
  role: string;
  role_id?: string;
  email: string;
  display_name: string;
  is_owner: boolean;
  joined_at: string;
}

interface RoleOption {
  id: string;
  name: string;
  is_system_role: boolean;
}

interface FetchUsersResponse {
  success: boolean;
  data?: WorkspaceUser[];
  error?: string;
  can_manage_users?: boolean;
  current_user_id?: string;
}

interface ProjectOption {
  id: string;
  name: string;
  code: string | null;
}

const SYSTEM_ROLE_ORDER = ["owner", "member"];

const SYSTEM_ROLE_OPTIONS: RoleOption[] = [
  { id: "owner", name: "owner", is_system_role: true },
  { id: "member", name: "member", is_system_role: true },
];

export default function WorkspaceUsersPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;

  const [users, setUsers] = useState<WorkspaceUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDashboardPermissionsOpen, setIsDashboardPermissionsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<WorkspaceUser | null>(null);
  const [availableRoles, setAvailableRoles] = useState<RoleOption[]>(SYSTEM_ROLE_OPTIONS);
  const [canManageUsers, setCanManageUsers] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [availableProjects, setAvailableProjects] = useState<ProjectOption[]>([]);

  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("member");
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [isInviting, setIsInviting] = useState(false);

  const [editUserRole, setEditUserRole] = useState("member");

  useEffect(() => {
    if (workspaceId) {
      void fetchUsers();
      void fetchProjects();
    }
  }, [workspaceId]);

  const fetchProjects = async () => {
    try {
      const response = await fetch(
        `/api/projects?workspace_id=${workspaceId}&exclude_status=completed,cancelled`,
        { cache: "no-store" }
      );

      const result = await response.json();
      if (!response.ok || !result?.success || !Array.isArray(result.data)) {
        setAvailableProjects([]);
        return;
      }

      const projects = result.data.map((project: any) => ({
        id: project.id,
        name: project.name,
        code: project.code || null,
      }));

      setAvailableProjects(projects);
    } catch (fetchError) {
      console.error("Error fetching projects for invitation:", fetchError);
      setAvailableProjects([]);
    }
  };

  const fetchAvailableRoles = async () => {
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/roles`, {
        cache: "no-store",
      });

      const result = await response.json();
      if (!response.ok || !result?.success || !Array.isArray(result.data)) {
        setAvailableRoles(SYSTEM_ROLE_OPTIONS);
        return;
      }

      const systemRoleMap = new Map<string, RoleOption>();
      SYSTEM_ROLE_OPTIONS.forEach((role) => {
        systemRoleMap.set(role.name, role);
      });

      const customRoleMap = new Map<string, RoleOption>();

      result.data.forEach((role: any) => {
        if (!role || typeof role.id !== "string" || typeof role.name !== "string") {
          return;
        }

        const normalizedRole: RoleOption = {
          id: role.id,
          name: role.name,
          is_system_role: Boolean(role.is_system_role),
        };

        if (normalizedRole.is_system_role && SYSTEM_ROLE_ORDER.includes(normalizedRole.name)) {
          systemRoleMap.set(normalizedRole.name, normalizedRole);
          return;
        }

        if (!normalizedRole.is_system_role) {
          customRoleMap.set(normalizedRole.id, normalizedRole);
        }
      });

      const orderedSystemRoles = SYSTEM_ROLE_ORDER.map((systemRoleName) =>
        systemRoleMap.get(systemRoleName)
      ).filter((role): role is RoleOption => Boolean(role));

      const orderedCustomRoles = Array.from(customRoleMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      setAvailableRoles([...orderedSystemRoles, ...orderedCustomRoles]);
    } catch (fetchError) {
      console.error("Error fetching available roles:", fetchError);
      setAvailableRoles(SYSTEM_ROLE_OPTIONS);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/workspaces/${workspaceId}/users`, {
        cache: "no-store",
      });

      const result = (await response.json()) as FetchUsersResponse;

      if (!response.ok || !result.success) {
        setUsers([]);
        setCanManageUsers(false);
        setCurrentUserId(null);
        setAvailableRoles(SYSTEM_ROLE_OPTIONS);
        setError(result.error || "Failed to fetch users");
        return;
      }

      setUsers(result.data || []);
      setCanManageUsers(Boolean(result.can_manage_users));
      setCurrentUserId(result.current_user_id || null);

      if (result.can_manage_users) {
        await fetchAvailableRoles();
      } else {
        setAvailableRoles(SYSTEM_ROLE_OPTIONS);
      }
    } catch (fetchError) {
      setUsers([]);
      setCanManageUsers(false);
      setCurrentUserId(null);
      setAvailableRoles(SYSTEM_ROLE_OPTIONS);
      setError("Failed to fetch users");
      console.error("Error fetching users:", fetchError);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUserEmail.trim()) {
      setError("Email je povinný");
      toast({
        title: "Chyba",
        description: "Email je povinný",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsInviting(true);
      setError(null);

      const response = await fetch(`/api/workspaces/${workspaceId}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: newUserEmail.trim(),
          role: newUserRole,
          project_ids: selectedProjectIds,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result?.success) {
        setError(result?.error || "Failed to add user");
        toast({
          title: "Chyba",
          description: result?.error || "Nepodarilo sa odoslať pozvánku",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Pozvánka odoslaná",
        description: result?.message || "Používateľ dostane pozvánku v zvončeku.",
      });

      setNewUserEmail("");
      setNewUserRole("member");
      setSelectedProjectIds([]);
      setIsAddDialogOpen(false);
      await fetchUsers();
    } catch (addError) {
      setError("Nepodarilo sa odoslať pozvánku");
      console.error("Error adding user:", addError);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa odoslať pozvánku",
        variant: "destructive",
      });
    } finally {
      setIsInviting(false);
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) {
      return;
    }

    try {
      setError(null);

      const response = await fetch(
        `/api/workspaces/${workspaceId}/users/${selectedUser.user_id}/role`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ role: editUserRole }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result?.success) {
        setError(result?.error || "Failed to update user role");
        return;
      }

      setSelectedUser(null);
      setEditUserRole("member");
      setIsEditDialogOpen(false);
      await fetchUsers();
    } catch (editError) {
      setError("Failed to update user role");
      console.error("Error updating user role:", editError);
    }
  };

  const handleRemoveUser = async (targetUser: WorkspaceUser) => {
    if (!confirm(`Naozaj chcete odstrániť používateľa ${targetUser.display_name}?`)) {
      return;
    }

    try {
      setError(null);

      const response = await fetch(`/api/workspaces/${workspaceId}/users/${targetUser.user_id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok || !result?.success) {
        setError(result?.error || "Failed to remove user");
        return;
      }

      await fetchUsers();
    } catch (removeError) {
      setError("Failed to remove user");
      console.error("Error removing user:", removeError);
    }
  };

  const openEditDialog = (user: WorkspaceUser) => {
    setSelectedUser(user);
    setEditUserRole(user.role_id || user.role);
    setIsEditDialogOpen(true);
  };

  const toggleSelectedProject = (projectId: string) => {
    setSelectedProjectIds((previous) =>
      previous.includes(projectId)
        ? previous.filter((id) => id !== projectId)
        : [...previous, projectId]
    );
  };

  const getRoleIcon = (role: string, isOwner: boolean) => {
    if (isOwner) return <Crown className="h-4 w-4 text-yellow-500" />;
    if (role === "owner") return <Shield className="h-4 w-4 text-yellow-500" />;
    return <User className="h-4 w-4 text-muted-foreground" />;
  };

  const getRoleBadgeVariant = (role: string, isOwner: boolean) => {
    if (isOwner) return "default";
    if (role === "owner") return "secondary";
    return "outline";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Users className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Načítavam používateľov...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Správa používateľov</h1>
          <p className="text-muted-foreground mt-1">
            Spravujte používateľov a ich roly v workspace
          </p>
        </div>

        {canManageUsers && (
          <Dialog
            open={isAddDialogOpen}
            onOpenChange={(open) => {
              setIsAddDialogOpen(open);
              if (!open) {
                setSelectedProjectIds([]);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="bg-gray-900 text-white hover:bg-gray-800">
                <Plus className="h-4 w-4 mr-2" />
                Pozvať používateľa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Pozvať používateľa</DialogTitle>
                <DialogDescription>
                  Pozvánka sa zobrazí používateľovi v zvončeku. Voliteľne môžete obmedziť prístup
                  len na vybrané projekty.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUserEmail}
                    onChange={(event) => setNewUserEmail(event.target.value)}
                    placeholder="používateľ@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="role">Rola</Label>
                  <Select value={newUserRole} onValueChange={setNewUserRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles
                        .filter(
                          (role) => role.is_system_role && SYSTEM_ROLE_ORDER.includes(role.name)
                        )
                        .map((role) => (
                          <SelectItem key={role.id} value={role.name}>
                            {getRoleDisplayName(role.name)}
                          </SelectItem>
                        ))}
                      {availableRoles
                        .filter((role) => !role.is_system_role)
                        .map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Prístup k projektom (voliteľné)</Label>
                  <p className="text-xs text-muted-foreground">
                    Ak nevyberiete žiadny projekt, používateľ po prijatí uvidí celý workspace.
                  </p>
                  <div className="max-h-44 overflow-y-auto rounded-md border p-3 space-y-3">
                    {availableProjects.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        Nenašli sa žiadne aktívne projekty.
                      </p>
                    )}
                    {availableProjects.map((project) => (
                      <label key={project.id} className="flex items-start gap-3 cursor-pointer">
                        <Checkbox
                          checked={selectedProjectIds.includes(project.id)}
                          onCheckedChange={() => toggleSelectedProject(project.id)}
                          className="mt-0.5"
                        />
                        <span className="text-sm">
                          {project.name}
                          {project.code ? (
                            <span className="text-xs text-muted-foreground ml-1">
                              ({project.code})
                            </span>
                          ) : null}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    setSelectedProjectIds([]);
                  }}
                >
                  Zrušiť
                </Button>
                <Button onClick={handleAddUser} disabled={isInviting}>
                  {isInviting ? "Odosielam..." : "Odoslať pozvánku"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Žiadni používatelia</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Používateľ</TableHead>
                  <TableHead>Rola</TableHead>
                  <TableHead>Pridaný</TableHead>
                  <TableHead>Akcie</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const canOpenDashboardPermissions =
                    canManageUsers || user.user_id === currentUserId;

                  return (
                    <TableRow key={user.user_id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            {getRoleIcon(user.role, user.is_owner)}
                          </div>
                          <div>
                            <div className="font-medium">{user.display_name}</div>
                            <div className="text-sm text-muted-foreground flex items-center">
                              <Mail className="h-3 w-3 mr-1" />
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role, user.is_owner)}>
                          {getRoleLabel(user.role, user.is_owner)}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(user.joined_at).toLocaleDateString("sk-SK")}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {canOpenDashboardPermissions && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setIsDashboardPermissionsOpen(true);
                              }}
                              title="Nastavenie viditeľnosti dashboardu"
                            >
                              <Settings2 className="h-4 w-4" />
                            </Button>
                          )}

                          {canManageUsers && !user.is_owner && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(user)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveUser(user)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}

                          {user.is_owner && (
                            <span className="text-sm text-muted-foreground">Majiteľ</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upraviť rolu používateľa</DialogTitle>
            <DialogDescription>
              Zmeňte rolu používateľa {selectedUser?.display_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-role">Rola</Label>
              <Select value={editUserRole} onValueChange={setEditUserRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles
                    .filter((role) => role.is_system_role && SYSTEM_ROLE_ORDER.includes(role.name))
                    .map((role) => (
                      <SelectItem key={role.id} value={role.name}>
                        {getRoleDisplayName(role.name)}
                      </SelectItem>
                    ))}
                  {availableRoles
                    .filter((role) => !role.is_system_role)
                    .map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Zrušiť
            </Button>
            <Button onClick={handleEditUser}>Uložiť</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedUser && (
        <DashboardPermissionsDialog
          open={isDashboardPermissionsOpen}
          onOpenChange={setIsDashboardPermissionsOpen}
          workspaceId={workspaceId}
          userId={selectedUser.user_id}
          userName={selectedUser.display_name}
        />
      )}
    </div>
  );
}
