"use client";

import { useState, useEffect } from "react";
import { UserProfile, UserRole } from "@/types/user";
import { getRoleDisplayName } from "@/lib/role-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  MoreHorizontal, 
  Search, 
  UserPlus, 
  UserMinus, 
  Trash2,
  Loader2 
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { sk } from "date-fns/locale";

export function UserTable() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = async (query = "") => {
    try {
      const url = query ? `/api/users?q=${encodeURIComponent(query)}` : "/api/users";
      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setUsers(result.data);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa načítať používateľov",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    fetchUsers(query);
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setActionLoading(userId);
    
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      const result = await response.json();

      if (result.success) {
        setUsers(users.map(user => 
          user.id === userId ? { ...user, role: newRole } : user
        ));
        
        toast({
          title: "Rola zmenená",
          description: `Používateľ má teraz rolu ${newRole === 'admin' ? 'Administrátor' : 'Používateľ'}`,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error updating user role:", error);
      toast({
        title: "Chyba",
        description: error instanceof Error ? error.message : "Nepodarilo sa zmeniť rolu",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Naozaj chcete vymazať používateľa "${userName}"?`)) {
      return;
    }

    setActionLoading(userId);
    
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        setUsers(users.filter(user => user.id !== userId));
        toast({
          title: "Používateľ vymazaný",
          description: `Používateľ "${userName}" bol úspešne vymazaný`,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: "Chyba",
        description: error instanceof Error ? error.message : "Nepodarilo sa vymazať používateľa",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    return role === 'admin' ? 'default' : 'secondary';
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Načítavam používateľov...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Hľadať používateľov..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Používateľ</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Rola</TableHead>
              <TableHead>Registrácia</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Žiadni používatelia neboli nájdení
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.display_name}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {getRoleDisplayName(user.role)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(user.created_at), 'dd.MM.yyyy', { locale: sk })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Otvoriť menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {user.role === 'member' ? (
                          <DropdownMenuItem
                            onClick={() => handleRoleChange(user.id, 'admin')}
                            disabled={actionLoading === user.id}
                          >
                            <UserPlus className="mr-2 h-4 w-4" />
                            Povýšiť na admina
                          </DropdownMenuItem>
                        ) : user.role === 'admin' ? (
                          <DropdownMenuItem
                            onClick={() => handleRoleChange(user.id, 'member')}
                            disabled={actionLoading === user.id}
                          >
                            <UserMinus className="mr-2 h-4 w-4" />
                            Znížiť na člena
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuItem
                          onClick={() => handleDeleteUser(user.id, user.display_name)}
                          disabled={actionLoading === user.id}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Vymazať
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
