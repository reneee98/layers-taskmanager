"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bug, CheckCircle2, Circle, Search, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface BugReport {
  id: string;
  user_id: string;
  description: string;
  url: string;
  is_resolved: boolean;
  created_at: string;
  user?: {
    id: string;
    email: string;
    display_name?: string;
    first_name?: string;
    last_name?: string;
  };
}

type FilterStatus = "all" | "resolved" | "unresolved";

export default function BugsPage() {
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [filteredBugs, setFilteredBugs] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();

  // Check if user is superadmin
  const isSuperadmin = user?.email === 'design@renemoravec.sk' || 
                       user?.email === 'rene@renemoravec.sk';

  useEffect(() => {
    // Redirect if not superadmin
    if (user && !isSuperadmin) {
      toast({
        title: "Prístup zamietnutý",
        description: "Iba superadmin môže vidieť bug reporty",
        variant: "destructive",
      });
      router.push("/dashboard");
      return;
    }

    if (isSuperadmin) {
      fetchBugs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isSuperadmin]);

  useEffect(() => {
    filterBugs();
  }, [searchTerm, statusFilter, bugs]);

  const fetchBugs = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/bugs");
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Nepodarilo sa načítať bug reporty");
      }

      setBugs(result.data || []);
    } catch (error) {
      console.error("Error fetching bugs:", error);
      toast({
        title: "Chyba",
        description: error instanceof Error ? error.message : "Nepodarilo sa načítať bug reporty",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterBugs = () => {
    let filtered = bugs;

    // Filter by status
    if (statusFilter === "resolved") {
      filtered = filtered.filter(bug => bug.is_resolved);
    } else if (statusFilter === "unresolved") {
      filtered = filtered.filter(bug => !bug.is_resolved);
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(bug =>
        bug.description.toLowerCase().includes(searchLower) ||
        bug.url.toLowerCase().includes(searchLower) ||
        getUserDisplayName(bug).toLowerCase().includes(searchLower) ||
        bug.user?.email?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredBugs(filtered);
  };

  const handleToggleResolved = async (bugId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/bugs/${bugId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          is_resolved: !currentStatus,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Nepodarilo sa aktualizovať bug report");
      }

      toast({
        title: "Úspech",
        description: currentStatus ? "Bug report označený ako nevyriešený" : "Bug report označený ako vyriešený",
      });

      // Update local state
      setBugs(bugs.map(bug => 
        bug.id === bugId ? { ...bug, is_resolved: !currentStatus } : bug
      ));
    } catch (error) {
      console.error("Error updating bug:", error);
      toast({
        title: "Chyba",
        description: error instanceof Error ? error.message : "Nepodarilo sa aktualizovať bug report",
        variant: "destructive",
      });
    }
  };

  const getUserDisplayName = (bug: BugReport) => {
    if (bug.user) {
      if (bug.user.first_name || bug.user.last_name) {
        return `${bug.user.first_name || ""} ${bug.user.last_name || ""}`.trim();
      }
      return bug.user.display_name || bug.user.email;
    }
    return "Neznámy používateľ";
  };

  // Don't render if not superadmin
  if (!user || !isSuperadmin) {
    return null;
  }

  const resolvedCount = bugs.filter(b => b.is_resolved).length;
  const unresolvedCount = bugs.filter(b => !b.is_resolved).length;

  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Bug className="h-6 w-6" />
            Bug reporty
          </h1>
          <p className="text-muted-foreground mt-1">Prehľad všetkých nahlásených bugov</p>
        </div>
        <Button onClick={fetchBugs} variant="outline">
          Obnoviť
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Hľadať bug reporty..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as FilterStatus)}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všetky ({bugs.length})</SelectItem>
            <SelectItem value="unresolved">Nevyriešené ({unresolvedCount})</SelectItem>
            <SelectItem value="resolved">Vyriešené ({resolvedCount})</SelectItem>
          </SelectContent>
        </Select>
        {(searchTerm || statusFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("all");
            }}
          >
            <X className="h-4 w-4 mr-2" />
            Resetovať
          </Button>
        )}
      </div>

      {/* Bugs Table */}
      <div className="bg-card border border-border rounded-lg shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted">
              <TableHead className="w-[50px]"></TableHead>
              <TableHead className="text-muted-foreground font-semibold">Popis</TableHead>
              <TableHead className="text-muted-foreground font-semibold">URL</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Používateľ</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Dátum</TableHead>
              <TableHead className="w-[100px] text-muted-foreground font-semibold">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  Načítavam...
                </TableCell>
              </TableRow>
            ) : filteredBugs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Bug className="h-12 w-12 opacity-50" />
                    <p className="text-lg font-medium">Žiadne bug reporty</p>
                    <p className="text-sm">
                      {searchTerm || statusFilter !== "all"
                        ? "Nenašli sa žiadne bug reporty podľa filtrov"
                        : "Ešte neboli nahlásené žiadne bugy"}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredBugs.map((bug) => (
                <TableRow
                  key={bug.id}
                  className={cn(
                    "hover:bg-muted transition-colors",
                    bug.is_resolved && "opacity-60"
                  )}
                >
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleResolved(bug.id, bug.is_resolved)}
                      className="h-8 w-8"
                      title={bug.is_resolved ? "Označiť ako nevyriešený" : "Označiť ako vyriešený"}
                    >
                      {bug.is_resolved ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <p className="text-sm font-medium text-foreground line-clamp-2">
                      {bug.description}
                    </p>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <a
                      href={bug.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline break-all line-clamp-1"
                    >
                      {bug.url}
                    </a>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p className="font-medium text-foreground">{getUserDisplayName(bug)}</p>
                      {bug.user?.email && (
                        <p className="text-xs text-muted-foreground">{bug.user.email}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(bug.created_at), "PPp", { locale: sk })}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={bug.is_resolved ? "default" : "secondary"}
                      className={cn(
                        bug.is_resolved
                          ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                          : "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
                      )}
                    >
                      {bug.is_resolved ? "Vyriešený" : "Nevyriešený"}
                    </Badge>
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
