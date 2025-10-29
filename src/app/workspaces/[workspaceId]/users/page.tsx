"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  AlertTriangle
} from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";

interface WorkspaceUser {
  user_id: string;
  role: string;
  email: string;
  display_name: string;
  is_owner: boolean;
  joined_at: string;
}

export default function WorkspaceUsersPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const { workspace } = useWorkspace();
  
  const [users, setUsers] = useState<WorkspaceUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<WorkspaceUser | null>(null);
  
  // Add user form
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("member");
  
  // Edit user form
  const [editUserRole, setEditUserRole] = useState("member");

  useEffect(() => {
    if (workspaceId) {
      fetchUsers();
    }
  }, [workspaceId]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log("=== FRONTEND FETCH USERS ===");
      
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log("Frontend User:", user ? { id: user.id, email: user.email } : "null");
      console.log("Frontend Auth error:", authError);
      
      if (authError || !user) {
        setError("Not authenticated");
        return;
      }

      // Check if current user has access to the workspace
      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .select('owner_id')
        .eq('id', workspaceId)
        .single();

      if (workspaceError || !workspace) {
        setError("Workspace not found");
        return;
      }

      // Check if user is owner or member
      const isWorkspaceOwner = workspace.owner_id === user.id;
      const { data: member } = await supabase
        .from('workspace_members')
        .select('id, role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .single();

      const isOwner = isWorkspaceOwner || member?.role === 'owner';

      if (!isOwner && !member) {
        setError("Access denied - not a member of this workspace");
        return;
      }

      // Get workspace members
      const { data: members, error: membersError } = await supabase
        .from('workspace_members')
        .select('user_id, role, created_at')
        .eq('workspace_id', workspaceId);

      if (membersError) {
        console.error("Error fetching workspace members:", membersError);
        setError("Failed to fetch workspace members");
        return;
      }

      // Collect all user IDs (members + owner if not in members)
      const memberUserIds = members.map(m => m.user_id);
      const allUserIds = [...new Set([...memberUserIds, workspace.owner_id])];

      // Get profiles for all users (members + owner)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, email')
        .in('id', allUserIds);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        setError("Failed to fetch user profiles");
        return;
      }

      // Create a map of user_id -> profile for quick lookup
      const profileMap = new Map(profiles.map(p => [p.id, p]));
      
      // Create a map of user_id -> member data for quick lookup
      const memberMap = new Map(members.map(m => [m.user_id, m]));

      // Format all users (owner + members)
      const formattedMembers: WorkspaceUser[] = [];
      
      // Add owner first (if exists and has profile)
      if (workspace.owner_id) {
        const ownerProfile = profileMap.get(workspace.owner_id);
        if (ownerProfile) {
          const ownerMember = memberMap.get(workspace.owner_id);
          formattedMembers.push({
            user_id: workspace.owner_id,
            role: ownerMember?.role || 'owner',
            display_name: ownerProfile.display_name || ownerProfile.email || 'Unknown User',
            email: ownerProfile.email,
            is_owner: true,
            joined_at: ownerMember?.created_at || workspace.created_at || new Date().toISOString(),
          });
        }
      }

      // Add other members (excluding owner if already added)
      members.forEach(m => {
        if (m.user_id !== workspace.owner_id) {
          const profile = profileMap.get(m.user_id);
          if (profile) {
            formattedMembers.push({
              user_id: m.user_id,
              role: m.role,
              display_name: profile.display_name || profile.email || 'Unknown User',
              email: profile.email,
              is_owner: false,
              joined_at: m.created_at,
            });
          }
        }
      });

      console.log("Frontend Members:", formattedMembers);
      setUsers(formattedMembers);
    } catch (err) {
      setError("Failed to fetch users");
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUserEmail.trim()) return;

    try {
      console.log("=== FRONTEND ADD USER ===");
      
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        setError("Not authenticated");
        return;
      }

      // Check if current user is owner of the workspace
      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .select('owner_id')
        .eq('id', workspaceId)
        .single();

      if (workspaceError || !workspace) {
        setError("Workspace not found");
        return;
      }

      // Check if current user is owner (either workspace owner or has owner role)
      const { data: currentMember } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .single();

      const isCurrentUserOwner = workspace.owner_id === user.id || currentMember?.role === 'owner';

      if (!isCurrentUserOwner) {
        setError("Only workspace owners can add users");
        return;
      }

      // Find user by email
      const { data: targetUser, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', newUserEmail.trim())
        .single();

      if (userError || !targetUser) {
        setError("User with this email not found");
        return;
      }

      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('user_id', targetUser.id)
        .single();

      if (existingMember) {
        setError("User is already a member of this workspace");
        return;
      }

      // Add user to workspace
      const { error: insertError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: workspaceId,
          user_id: targetUser.id,
          role: newUserRole
        });

      if (insertError) {
        console.error("Error adding user to workspace:", insertError);
        setError("Failed to add user to workspace");
        return;
      }

      setNewUserEmail("");
      setNewUserRole("member");
      setIsAddDialogOpen(false);
      fetchUsers();
    } catch (err) {
      setError("Failed to add user");
      console.error("Error adding user:", err);
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;

    try {
      console.log("=== FRONTEND EDIT USER ===");
      
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        setError("Not authenticated");
        return;
      }

      // Check if current user is owner of the workspace
      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .select('owner_id')
        .eq('id', workspaceId)
        .single();

      if (workspaceError || !workspace) {
        setError("Workspace not found");
        return;
      }

      // Check if current user is owner (either workspace owner or has owner role)
      const { data: currentMember } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .single();

      const isCurrentUserOwner = workspace.owner_id === user.id || currentMember?.role === 'owner';

      if (!isCurrentUserOwner) {
        setError("Only workspace owners can change user roles");
        return;
      }

      // Prevent owner from changing their own role
      if (selectedUser.user_id === user.id) {
        setError("Cannot change your own role");
        return;
      }

      // Prevent changing the role of another owner
      if (workspace.owner_id === selectedUser.user_id) {
        setError("Cannot change the role of another workspace owner");
        return;
      }

      // Update user role in workspace_members table
      const { error: updateError } = await supabase
        .from('workspace_members')
        .update({ role: editUserRole })
        .eq('workspace_id', workspaceId)
        .eq('user_id', selectedUser.user_id);

      if (updateError) {
        console.error("Error updating user role:", updateError);
        setError("Failed to update user role");
        return;
      }

      setSelectedUser(null);
      setEditUserRole("member");
      setIsEditDialogOpen(false);
      fetchUsers();
    } catch (err) {
      setError("Failed to update user role");
      console.error("Error updating user role:", err);
    }
  };

  const handleRemoveUser = async (user: WorkspaceUser) => {
    if (!confirm(`Naozaj chcete odstrániť používateľa ${user.display_name}?`)) return;

    try {
      console.log("=== FRONTEND REMOVE USER ===");
      
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      
      // Get current user
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !currentUser) {
        setError("Not authenticated");
        return;
      }

      // Check if current user is owner of the workspace
      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .select('owner_id')
        .eq('id', workspaceId)
        .single();

      if (workspaceError || !workspace) {
        setError("Workspace not found");
        return;
      }

      // Check if current user is owner (either workspace owner or has owner role)
      const { data: currentMember } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', currentUser.id)
        .single();

      const isCurrentUserOwner = workspace.owner_id === currentUser.id || currentMember?.role === 'owner';

      if (!isCurrentUserOwner) {
        setError("Only workspace owners can remove users");
        return;
      }

      // Prevent owner from removing themselves
      if (user.user_id === currentUser.id) {
        setError("Cannot remove yourself");
        return;
      }

      // Prevent removing another owner
      if (workspace.owner_id === user.user_id) {
        setError("Nie je možné odstrániť vlastníka workspace");
        return;
      }

      // Check if user is actually a member (not just owner without membership record)
      const { data: memberCheck } = await supabase
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.user_id)
        .single();

      if (!memberCheck) {
        setError("Používateľ nie je členom workspace, takže sa nedá odstrániť");
        return;
      }

      // Remove user from workspace
      const { error: deleteError } = await supabase
        .from('workspace_members')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.user_id);

      if (deleteError) {
        console.error("Error removing user from workspace:", deleteError);
        setError(`Chyba pri odstraňovaní: ${deleteError.message || "Nepodarilo sa odstrániť používateľa z workspace"}`);
        return;
      }

      fetchUsers();
    } catch (err) {
      setError("Failed to remove user");
      console.error("Error removing user:", err);
    }
  };

  const openEditDialog = (user: WorkspaceUser) => {
    setSelectedUser(user);
    setEditUserRole(user.role);
    setIsEditDialogOpen(true);
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

  const getRoleLabel = (role: string, isOwner: boolean) => {
    if (isOwner) return "Majiteľ";
    if (role === "owner") return "Majiteľ";
    return "Člen";
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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Správa používateľov</h1>
          <p className="text-muted-foreground">
            Spravujte používateľov a ich roly v workspace
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Pridať používateľa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Pridať používateľa</DialogTitle>
              <DialogDescription>
                Pridajte nového používateľa do workspace-u
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
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
                    <SelectItem value="member">Člen</SelectItem>
                    <SelectItem value="owner">Majiteľ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Zrušiť
              </Button>
              <Button onClick={handleAddUser}>Pridať</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
        <CardHeader>
          <CardTitle>Používatelia workspace-u</CardTitle>
        </CardHeader>
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
                {users.map((user) => (
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
                    <TableCell>
                      {new Date(user.joined_at).toLocaleDateString("sk-SK")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {!user.is_owner && (
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
                          <span className="text-sm text-muted-foreground">
                            Majiteľ
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
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
                  <SelectItem value="member">Člen</SelectItem>
                  <SelectItem value="owner">Majiteľ</SelectItem>
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
    </div>
  );
}
