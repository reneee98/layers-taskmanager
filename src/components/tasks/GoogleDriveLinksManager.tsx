"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, MoreHorizontal, Edit, Trash2, Copy, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface GoogleDriveLink {
  id: string;
  task_id: string;
  url: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

interface GoogleDriveLinksManagerProps {
  taskId: string;
}

export const GoogleDriveLinksManager = ({ taskId }: GoogleDriveLinksManagerProps) => {
  const [links, setLinks] = useState<GoogleDriveLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<GoogleDriveLink | null>(null);
  const [formData, setFormData] = useState({
    url: "",
    description: ""
  });

  // Fetch Google Drive links
  const fetchLinks = async () => {
    try {
      console.log("Fetching links for task:", taskId);
      const response = await fetch(`/api/tasks/${taskId}/items`, {
        credentials: 'include'
      });
      console.log("Response status:", response.status);
      const result = await response.json();
      console.log("Response data:", result);

      if (result.success) {
        setLinks(result.data || []);
      } else {
        console.error("Error fetching links:", result.error);
        toast({
          title: "Chyba",
          description: "Chyba pri načítavaní Google Drive linkov",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching Google Drive links:", error);
      toast({
        title: "Chyba",
        description: "Chyba pri načítavaní Google Drive linkov",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, [taskId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.url.trim()) {
      toast({
        title: "Chyba",
        description: "URL je povinné",
        variant: "destructive",
      });
      return;
    }

    try {
      const url = editingLink 
        ? `/api/tasks/${taskId}/items/${editingLink.id}`
        : `/api/tasks/${taskId}/items`;
      
      const method = editingLink ? "PUT" : "POST";
      
      console.log("Submitting to:", url, "Method:", method);
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      console.log("Submit response:", result);

      if (result.success) {
        toast({
          title: "Úspech",
          description: editingLink ? "Google Drive link bol aktualizovaný" : "Google Drive link bol pridaný",
        });
        setIsDialogOpen(false);
        setFormData({ url: "", description: "" });
        setEditingLink(null);
        fetchLinks();
      } else {
        toast({
          title: "Chyba",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error submitting Google Drive link:", error);
      toast({
        title: "Chyba",
        description: "Chyba pri ukladaní Google Drive linku",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (link: GoogleDriveLink) => {
    setEditingLink(link);
    setFormData({
      url: link.url,
      description: link.description || ""
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (linkId: string) => {
    if (!confirm("Naozaj chcete vymazať tento Google Drive link?")) {
      return;
    }

    try {
      console.log("Deleting link:", linkId);
      const response = await fetch(`/api/tasks/${taskId}/items/${linkId}`, {
        method: "DELETE",
        credentials: 'include'
      });

      const result = await response.json();
      console.log("Delete response:", result);

      if (result.success) {
        toast({
          title: "Úspech",
          description: "Google Drive link bol vymazaný",
        });
        fetchLinks();
      } else {
        toast({
          title: "Chyba",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting Google Drive link:", error);
      toast({
        title: "Chyba",
        description: "Chyba pri mazaní Google Drive linku",
        variant: "destructive",
      });
    }
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: "Úspech",
      description: "Link bol skopírovaný do schránky",
    });
  };

  const handleOpenLink = (url: string) => {
    window.open(url, '_blank');
  };

  const openAddDialog = () => {
    setEditingLink(null);
    setFormData({ url: "", description: "" });
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Google Drive linky
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Načítavam...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Google Drive linky
          </div>
          <Button onClick={openAddDialog} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Pridať link
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {links.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            Žiadne Google Drive linky
          </div>
        ) : (
          <div className="space-y-3">
            {links.map((link) => (
              <div key={link.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 truncate"
                    >
                      {link.url}
                    </a>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenLink(link.url)}
                      className="h-6 w-6 p-0"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                  {link.description && (
                    <Badge variant="secondary" className="text-xs">
                      {link.description}
                    </Badge>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleCopy(link.url)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Kopírovať
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleEdit(link)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Upraviť
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDelete(link.id)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Vymazať
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </CardContent>

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
            <div className="space-y-2">
              <Label htmlFor="url">URL adresa *</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://drive.google.com/..."
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Popis (voliteľný)</Label>
              <Textarea
                id="description"
                placeholder="Napríklad: export ver.1, finálna verzia, atď."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Zrušiť
              </Button>
              <Button type="submit">
                {editingLink ? "Uložiť zmeny" : "Pridať link"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
