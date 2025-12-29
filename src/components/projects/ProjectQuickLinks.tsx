"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, MoreHorizontal, Link as LinkIcon, ExternalLink, Trash2, Edit3, Plus } from "lucide-react";
import { usePermission } from "@/hooks/usePermissions";
import type { ProjectQuickLink } from "@/types/database";

interface ProjectQuickLinksProps {
  projectId: string;
}

export function ProjectQuickLinks({ projectId }: ProjectQuickLinksProps) {
  const [links, setLinks] = useState<ProjectQuickLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ url: "", description: "" });
  const [editingLink, setEditingLink] = useState<ProjectQuickLink | null>(null);
  const { hasPermission: canManageProjects } = usePermission('projects', 'update');

  const fetchLinks = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/links`, {
        credentials: 'include'
      });
      const result = await response.json();

      if (response.ok) {
        setLinks(result.data || []);
      } else {
        toast({
          title: "Chyba",
          description: result.error || "Chyba pri načítavaní linkov",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Chyba pri načítavaní linkov",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchLinks();
    }
  }, [projectId]);

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

    try {
      let testUrl = formData.url;
      if (!testUrl.startsWith('http://') && !testUrl.startsWith('https://')) {
        testUrl = 'https://' + testUrl;
      }
      new URL(testUrl);
    } catch {
      toast({
        title: "Chyba",
        description: "Neplatná URL adresa",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const url = editingLink
      ? `/api/projects/${projectId}/links/${editingLink.id}`
      : `/api/projects/${projectId}/links`;
    const method = editingLink ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({
          url: formData.url.startsWith('http') ? formData.url : 'https://' + formData.url,
          description: formData.description || "",
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Úspech",
          description: editingLink ? "Link bol aktualizovaný" : "Link bol pridaný",
        });
        setIsDialogOpen(false);
        setFormData({ url: "", description: "" });
        setEditingLink(null);
        fetchLinks();
      } else {
        let errorMessage = result.error || "Chyba pri ukladaní linku";
        
        if (result.validation && Array.isArray(result.validation)) {
          errorMessage = result.validation.map((err: any) => err.message).join(", ");
        }
        
        toast({
          title: "Chyba",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error) {
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
      const response = await fetch(`/api/projects/${projectId}/links/${linkId}`, {
        method: "DELETE",
        credentials: 'include'
      });
      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Úspech",
          description: "Link bol vymazaný",
        });
        fetchLinks();
      } else {
        toast({
          title: "Chyba",
          description: result.error || "Chyba pri mazaní linku",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Chyba pri mazaní linku",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (link: ProjectQuickLink) => {
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
    <div className="bg-white dark:bg-card border border-[#e2e8f0] dark:border-border rounded-[14px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] overflow-hidden">
      <div className="pt-[21px] px-[21px] pb-4">
        <div className="h-[16.5px] mb-4">
          <p className="font-bold leading-[16.5px] text-[#90a1b9] dark:text-muted-foreground text-[11px] tracking-[0.6145px] uppercase">
            Rýchle odkazy
          </p>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {!isLoading && links.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-4">
            <p className="text-center text-muted-foreground text-sm">Žiadne linky.</p>
            {canManageProjects && (
              <Button onClick={handleAddClick} variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" /> Pridať link
              </Button>
            )}
          </div>
        )}

        {!isLoading && links.length > 0 && (
          <div className="flex flex-col gap-2">
            {links.map((link) => (
              <div
                key={link.id}
                className="bg-[#f8fafc] dark:bg-muted/30 border border-[#f1f5f9] dark:border-border flex h-[54px] items-center justify-between px-[13px] py-px rounded-[10px] group"
              >
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 h-[28px] flex-1 min-w-0"
                >
                  <div className="bg-white dark:bg-card rounded-[8px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] shrink-0 size-[28px] flex items-center justify-center">
                    <LinkIcon className="h-4 w-4 text-[#314158] dark:text-foreground" />
                  </div>
                  <span className="text-[12px] font-bold text-[#314158] dark:text-foreground truncate">
                    {link.description || "Link"}
                  </span>
                </a>
                <div className="flex items-center gap-2 shrink-0">
                  <ExternalLink className="h-[14px] w-[14px] text-[#62748e] dark:text-muted-foreground group-hover:text-[#314158] dark:group-hover:text-foreground transition-colors" />
                  {canManageProjects && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-muted"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(link)}>
                          <Edit3 className="h-4 w-4 mr-2" />
                          Upraviť
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(link.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Vymazať
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            ))}
            {canManageProjects && (
              <Button onClick={handleAddClick} variant="outline" size="sm" className="w-full mt-2">
                <Plus className="mr-2 h-4 w-4" /> Pridať link
              </Button>
            )}
          </div>
        )}
      </div>

      {canManageProjects && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingLink ? "Upraviť link" : "Pridať link"}
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
                  type="url"
                  value={formData.url}
                  onChange={handleInputChange}
                  placeholder="https://example.com/..."
                  autoComplete="url"
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
                  placeholder="Napríklad: Logo Exporty, Brief & Zadanie..."
                  autoComplete="off"
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
      )}
    </div>
  );
}

