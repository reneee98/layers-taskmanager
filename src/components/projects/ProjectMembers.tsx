"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, UserPlus, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import type { ProjectMemberOption, ProjectMembersResponse } from "@/types/project-members";

export const ProjectMembers = ({ projectId }: { projectId: string }) => {
  const [members, setMembers] = useState<ProjectMemberOption[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  const fetchMembers = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setError(null);
        const response = await fetch(`/api/projects/${projectId}/members`, {
          cache: "no-store",
          signal,
        });
        const result: ProjectMembersResponse = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || "Nepodarilo sa načítať členov projektu");
        }
        if (signal?.aborted) return;
        setMembers(result.data ?? []);
        setCanManage(Boolean(result.can_manage_members));
      } catch (fetchError) {
        if (signal?.aborted) return;
        setError(
          fetchError instanceof Error ? fetchError.message : "Nepodarilo sa načítať členov projektu"
        );
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [projectId]
  );

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setMembers([]);
    setCanManage(false);
    setSelectedUserId("");
    void fetchMembers(controller.signal);
    return () => controller.abort();
  }, [fetchMembers]);

  const handleChangeMember = async (userId: string, remove: boolean) => {
    setSavingUserId(userId);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/members`, {
        method: remove ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      const result: ProjectMembersResponse = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.error || "Nepodarilo sa uložiť zmenu");
      // Reflect only the server-confirmed change, even if the following refresh fails.
      setMembers((previous) =>
        previous.map((member) =>
          member.user_id === userId ? { ...member, is_assigned: !remove } : member
        )
      );
      setSelectedUserId("");
      toast({ title: remove ? "Člen bol odobratý z projektu" : "Člen bol priradený k projektu" });
      await fetchMembers();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Nepodarilo sa uložiť zmenu";
      setError(message);
      toast({ title: "Chyba", description: message, variant: "destructive" });
    } finally {
      setSavingUserId(null);
    }
  };

  if (!loading && !error && !canManage) return null;

  const assignedMembers = members.filter((member) => member.is_assigned && !member.is_privileged);
  const availableMembers = members.filter((member) => !member.is_assigned && !member.is_privileged);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          Členovia projektu
          {!loading && <Badge variant="secondary">{assignedMembers.length}</Badge>}
        </CardTitle>
        <CardDescription>
          Priraďte ľudí z tímu k tomuto projektu. Členovia s obmedzeným prístupom ho po priradení
          uvidia.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4" aria-busy={loading || Boolean(savingUserId)}>
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
            <Loader2 className="h-4 w-4 animate-spin" /> Načítavam členov…
          </p>
        ) : (
          <>
            {error && (
              <div
                role="alert"
                className="flex flex-wrap items-center justify-between gap-2 text-sm text-destructive"
              >
                <span>{error}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={Boolean(savingUserId)}
                  onClick={() => void fetchMembers()}
                >
                  Skúsiť znova
                </Button>
              </div>
            )}
            {canManage && (
              <>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Select
                    value={selectedUserId}
                    onValueChange={setSelectedUserId}
                    disabled={Boolean(savingUserId) || availableMembers.length === 0}
                  >
                    <SelectTrigger aria-label="Vybrať člena tímu" className="sm:max-w-md">
                      <SelectValue
                        placeholder={
                          availableMembers.length
                            ? "Vybrať člena tímu"
                            : "Všetci členovia sú už priradení"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMembers.map((member) => (
                        <SelectItem key={member.user_id} value={member.user_id}>
                          {member.display_name}
                          {member.email && member.email !== member.display_name
                            ? ` (${member.email})`
                            : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    disabled={!selectedUserId || Boolean(savingUserId)}
                    onClick={() => void handleChangeMember(selectedUserId, false)}
                  >
                    {savingUserId === selectedUserId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4" />
                    )}
                    Priradiť člena
                  </Button>
                </div>
                {assignedMembers.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    K projektu zatiaľ nie je priradený žiadny člen.
                  </p>
                ) : (
                  <ul className="divide-y rounded-lg border">
                    {assignedMembers.map((member) => (
                      <li
                        key={member.user_id}
                        className="flex items-center justify-between gap-3 p-3"
                      >
                        <div className="min-w-0">
                          <p className="break-words text-sm font-medium">{member.display_name}</p>
                          {member.email !== member.display_name && (
                            <p className="break-words text-xs text-muted-foreground">
                              {member.email}
                            </p>
                          )}
                          {member.has_full_access && (
                            <p className="text-xs text-muted-foreground">
                              Má prístup ku všetkým projektom tímu
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0"
                          disabled={Boolean(savingUserId)}
                          aria-label={`Odobrať z projektu: ${member.display_name}`}
                          onClick={() => void handleChangeMember(member.user_id, true)}
                        >
                          {savingUserId === member.user_id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                          <span className="hidden sm:inline">Odobrať</span>
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-xs text-muted-foreground">
                  Odobratie zruší prístup k tomuto projektu iba členom s obmedzeným prístupom.
                  Majitelia a členovia s prístupom ku všetkým projektom ho vidia naďalej.
                </p>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
