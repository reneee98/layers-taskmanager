"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Check, X, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface WorkspaceInvitation {
  id: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
  created_at: string;
  workspace: {
    id: string;
    name: string;
    description: string;
  };
}

export function WorkspaceInvitations() {
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const isFetchingRef = useRef(false);
  const hasFetchedRef = useRef(false);

  const fetchInvitations = async () => {
    // Prevent duplicate calls
    if (isFetchingRef.current) {
      return;
    }

    try {
      isFetchingRef.current = true;
      const response = await fetch("/api/workspace-invitations");
      const result = await response.json();
      
      if (result.success) {
        setInvitations(result.data);
      } else {
        console.error("Error fetching invitations:", result.error);
        toast({
          title: "Chyba",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching invitations:", error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa načítať pozvánky",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
      hasFetchedRef.current = true;
    }
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      const response = await fetch(`/api/workspace-invitations/${invitationId}/accept`, {
        method: "POST",
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Úspech",
          description: "Úspešne ste sa pripojili k workspace",
        });
        // Refresh invitations
        await fetchInvitations();
        // TODO: Refresh workspace switcher
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error accepting invitation:", error);
      toast({
        title: "Chyba",
        description: error instanceof Error ? error.message : "Nepodarilo sa pripojiť k workspace",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    // Only fetch once - prevent duplicate calls in React Strict Mode
    if (!hasFetchedRef.current) {
      fetchInvitations();
    }
  }, []);

  // Don't show anything while loading or if there are no invitations
  // This prevents flickering
  if (loading || invitations.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Pozvánky do workspace
        </CardTitle>
        <CardDescription>
          Máte {invitations.length} nevybavených pozvánok
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {invitations.map((invitation) => (
          <div
            key={invitation.id}
            className="flex items-center justify-between p-4 border rounded-lg"
          >
            <div className="space-y-1">
              <div className="font-medium">{invitation.workspace.name}</div>
              <div className="text-sm text-muted-foreground">
                {invitation.workspace.description}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{invitation.role}</Badge>
                <span className="text-xs text-muted-foreground">
                  Vyprší: {format(new Date(invitation.expires_at), "dd.MM.yyyy HH:mm")}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => handleAcceptInvitation(invitation.id)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="h-4 w-4 mr-1" />
                Prijať
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  // TODO: Implement decline functionality
                  toast({
                    title: "Funkcia zatiaľ nie je implementovaná",
                    description: "Odmietnutie pozvánky zatiaľ nie je možné",
                  });
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Odmietnuť
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
