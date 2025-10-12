"use client";

import { useState, useEffect } from "react";
import { WorkspaceMember, InviteUserData } from "@/types/workspace";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Mail, MoreHorizontal, Trash2, UserCheck, Loader2, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useApiUrl } from "@/lib/api-utils";

interface WorkspaceMembersProps {
  workspaceId: string;
}

interface WorkspaceInvitation {
  id: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
  created_at: string;
}

export function WorkspaceMembers({ workspaceId }: WorkspaceMembersProps) {
  const { getApiUrl } = useApiUrl();
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteData, setInviteData] = useState<InviteUserData>({
    email: "",
    role: "member",
  });

  useEffect(() => {
    fetchMembers();
    fetchInvitations();
  }, [workspaceId]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const response = await fetch(getApiUrl(`/api/workspaces/${workspaceId}/members`));
      const result = await response.json();
      
      if (result.success) {
        setMembers(result.data);
      } else {
        toast({
          title: "Chyba",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching members:", error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa načítať členov",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchInvitations = async () => {
    try {
      const response = await fetch(getApiUrl(`/api/workspaces/${workspaceId}/invitations`));
      const result = await response.json();
      
      if (result.success) {
        setInvitations(result.data);
      } else {
        console.error("Error fetching invitations:", result.error);
      }
    } catch (error) {
      console.error("Error fetching invitations:", error);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    
    console.log("Sending invitation data:", inviteData);
    
    try {
      const response = await fetch(getApiUrl(`/api/workspaces/${workspaceId}/members`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inviteData),
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Pozvánka odoslaná",
          description: result.message,
        });
        setInviteDialogOpen(false);
        setInviteData({ email: "", role: "member" });
        fetchMembers();
        fetchInvitations();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error inviting user:", error);
      toast({
        title: "Chyba",
        description: error instanceof Error ? error.message : "Nepodarilo sa pozvať používateľa",
        variant: "destructive",
      });
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!window.confirm("Naozaj chcete odstrániť tohto člena?")) {
      return;
    }
    
    try {
      const response = await fetch(getApiUrl(`/api/workspaces/${workspaceId}/members/${memberId}`), {
        method: "DELETE",
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Člen odstránený",
          description: "Člen bol úspešne odstránený z workspace",
        });
        fetchMembers();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error removing member:", error);
      toast({
        title: "Chyba",
        description: error instanceof Error ? error.message : "Nepodarilo sa odstrániť člena",
        variant: "destructive",
      });
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!window.confirm("Naozaj chcete zrušiť túto pozvánku?")) {
      return;
    }
    
    try {
      const response = await fetch(getApiUrl(`/api/workspaces/${workspaceId}/invitations/${invitationId}`), {
        method: "DELETE",
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Pozvánka zrušená",
          description: "Pozvánka bola úspešne zrušená",
        });
        fetchInvitations();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error cancelling invitation:", error);
      toast({
        title: "Chyba",
        description: error instanceof Error ? error.message : "Nepodarilo sa zrušiť pozvánku",
        variant: "destructive",
      });
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'admin':
        return 'secondary';
      case 'member':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Majiteľ';
      case 'admin':
        return 'Admin';
      case 'member':
        return 'Člen';
      default:
        return role;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Členovia workspace</CardTitle>
              <CardDescription>
                Spravujte členov vášho workspace
              </CardDescription>
            </div>
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Pozvať používateľa
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleInviteUser}>
                  <DialogHeader>
                    <DialogTitle>Pozvať používateľa</DialogTitle>
                    <DialogDescription>
                      Pošlite pozvánku novému používateľovi do vášho workspace
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="používateľ@example.com"
                        value={inviteData.email}
                        onChange={(e) => setInviteData(prev => ({ ...prev, email: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Rola</Label>
                      <Select
                        value={inviteData.role}
                        onValueChange={(value: 'member') => setInviteData(prev => ({ ...prev, role: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Člen</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setInviteDialogOpen(false)}
                    >
                      Zrušiť
                    </Button>
                    <Button type="submit" disabled={inviteLoading}>
                      {inviteLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Mail className="h-4 w-4 mr-2" />
                      )}
                      Poslať pozvánku
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Pending Invitations */}
          {invitations.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Čakajúce pozvánky</h3>
              <div className="space-y-2">
                {invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-yellow-50 dark:bg-yellow-900/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-800 rounded-full flex items-center justify-center">
                        <Mail className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                      </div>
                      <div>
                        <p className="font-medium">{invitation.email}</p>
                        <p className="text-sm text-muted-foreground">
                          Rola: {invitation.role} • 
                          Vyprší: {new Date(invitation.expires_at).toLocaleDateString("sk-SK")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                        Čaká na potvrdenie
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCancelInvitation(invitation.id)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Zrušiť
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Používateľ</TableHead>
                  <TableHead>Rola</TableHead>
                  <TableHead>Pridaný</TableHead>
                  <TableHead className="text-right">Akcie</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      Žiadni členovia nájdení.
                    </TableCell>
                  </TableRow>
                ) : (
                  members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <UserCheck className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{member.user?.name || "Neznámy používateľ"}</p>
                            <p className="text-sm text-muted-foreground">{member.user?.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(member.role)}>
                          {getRoleLabel(member.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(member.joined_at), 'dd.MM.yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        {member.role !== 'owner' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMember(member.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
