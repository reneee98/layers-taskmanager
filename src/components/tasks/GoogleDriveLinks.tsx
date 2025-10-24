"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, MoreHorizontal, Link as LinkIcon, ExternalLink, Copy, Trash2, Edit3, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { GoogleDriveLink } from "@/types/database";

interface GoogleDriveLinksProps {
  taskId: string;
}

export function GoogleDriveLinks({ taskId }: GoogleDriveLinksProps) {
  const [links, setLinks] = useState<GoogleDriveLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ url: "", description: "" });
  const [editingLink, setEditingLink] = useState<GoogleDriveLink | null>(null);

  const fetchLinks = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/drive-links`, {
        credentials: 'include'
      });
      const result = await response.json();

      if (response.ok) {
        console.log("Fetched links:", result.data);
        setLinks(result.data);
      } else {
        console.error("Error fetching links:", result.error);
        toast({
          title: "Chyba",
          description: result.error || "Chyba pri načítavaní Google Drive linkov",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching links:", error);
      toast({
        title: "Chyba",
        description: "Chyba pri načítavaní Google Drive linkov",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (taskId) {
      fetchLinks();
    }
  }, [taskId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.url) {
      toast({
        title: "Chyba",
        description: "URL adresa je povinná",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const url = editingLink
      ? `/api/tasks/${taskId}/drive-links/${editingLink.id}`
      : `/api/tasks/${taskId}/drive-links`;
    const method = editingLink ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({
          url: formData.url,
          description: formData.description || null,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Úspech",
          description: editingLink ? "Google Drive link bol aktualizovaný" : "Google Drive link bol pridaný",
        });
        setIsDialogOpen(false);
        setFormData({ url: "", description: "" });
        setEditingLink(null);
        fetchLinks();
      } else {
        console.error("Submit response:", result);
        toast({
          title: "Chyba",
          description: result.error || "Chyba pri ukladaní linku",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Chyba",
        description: "Chyba pri ukladaní linku",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (linkId: string) => {
    if (!window.confirm("Naozaj chcete vymazať tento link?")) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/drive-links/${linkId}`, {
        method: "DELETE",
        credentials: 'include'
      });
      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Úspech",
          description: "Google Drive link bol vymazaný",
        });
        fetchLinks();
      } else {
        console.error("Delete response:", result);
        toast({
          title: "Chyba",
          description: result.error || "Chyba pri mazaní linku",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting link:", error);
      toast({
        title: "Chyba",
        description: "Chyba pri mazaní linku",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (link: GoogleDriveLink) => {
    setEditingLink(link);
    setFormData({ url: link.url, description: link.description || "" });
    setIsDialogOpen(true);
  };

  const handleAddClick = () => {
    setEditingLink(null);
    setFormData({ url: "", description: "" });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <Button onClick={handleAddClick} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
        <Plus className="mr-2 h-4 w-4" /> Pridať Google Drive link
      </Button>

      {isLoading && (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && links.length === 0 && (
        <p className="text-center text-muted-foreground">Žiadne Google Drive linky.</p>
      )}

      {!isLoading && links.length > 0 && (
        <div className="space-y-3">
          {links.map((link) => {
            console.log("Rendering link:", link);
            return (
            <div key={link.id} className="flex items-center justify-between rounded-md bg-muted/50 dark:bg-muted/30 p-3 border border-border dark:border-border">
              <div className="flex-1 min-w-0">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm font-medium text-primary hover:underline truncate"
                >
                  <LinkIcon className="h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                  <span className="truncate text-foreground">{link.description || "Google Drive link"}</span>
                  <ExternalLink className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                </a>
                <p className="text-xs text-muted-foreground mt-1 truncate">{link.url}</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0 ml-2 hover:bg-accent">
                    <span className="sr-only">Otvoriť menu</span>
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigator.clipboard.writeText(link.url)}>
                    <Copy className="mr-2 h-4 w-4" /> Kopírovať URL
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleEdit(link)}>
                    <Edit3 className="mr-2 h-4 w-4" /> Upraviť
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDelete(link.id)} className="text-red-600 focus:text-red-600">
                    <Trash2 className="mr-2 h-4 w-4" /> Vymazať
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            );
          })}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingLink ? "Upraviť Google Drive link" : "Pridať Google Drive link"}
            </DialogTitle>
            <DialogDescription>
              {editingLink ? "Upravte URL adresu a popis linku" : "Pridajte URL adresu a voliteľný popis"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="url">URL adresa</Label>
              <Input
                id="url"
                name="url"
                value={formData.url}
                onChange={handleInputChange}
                placeholder="https://drive.google.com/..."
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Popis (voliteľné)</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Export ver.1"
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Zrušiť
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingLink ? "Uložiť zmeny" : "Pridať link"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}