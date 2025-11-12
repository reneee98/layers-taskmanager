"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Share2, Copy, Check, Loader2, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface TaskShareButtonProps {
  taskId: string;
}

export const TaskShareButton = ({ taskId }: TaskShareButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchShareToken = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/share`);
      const result = await response.json();

      if (result.success) {
        setShareToken(result.data.shareToken);
        setShareUrl(result.data.shareUrl);
      } else {
        toast({
          title: "Chyba",
          description: result.error || "Nepodarilo sa načítať zdieľací odkaz",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching share token:", error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa načítať zdieľací odkaz",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateShareToken = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/share`, {
        method: "POST",
      });
      const result = await response.json();

      if (result.success) {
        setShareToken(result.data.shareToken);
        setShareUrl(result.data.shareUrl);
        toast({
          title: "Úspech",
          description: "Zdieľací odkaz bol vygenerovaný",
        });
      } else {
        toast({
          title: "Chyba",
          description: result.error || "Nepodarilo sa vygenerovať zdieľací odkaz",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error generating share token:", error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa vygenerovať zdieľací odkaz",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const disableSharing = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/share`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (result.success) {
        setShareToken(null);
        setShareUrl(null);
        toast({
          title: "Úspech",
          description: "Zdieľanie bolo deaktivované",
        });
      } else {
        toast({
          title: "Chyba",
          description: result.error || "Nepodarilo sa deaktivovať zdieľanie",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error disabling sharing:", error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa deaktivovať zdieľanie",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: "Skopírované",
        description: "Odkaz bol skopírovaný do schránky",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa skopírovať odkaz",
        variant: "destructive",
      });
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && !shareToken) {
      fetchShareToken();
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="text-muted-foreground hover:text-foreground"
      >
        <Share2 className="h-4 w-4 mr-2" />
        Zdieľať
      </Button>

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zdieľať úlohu</DialogTitle>
            <DialogDescription>
              Vygenerujte verejný odkaz na zdieľanie tejto úlohy. Odkaz bude prístupný všetkým, ktorí ho majú.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : shareToken && shareUrl ? (
              <>
                <div className="space-y-2">
                  <Label>Zdieľací odkaz</Label>
                  <div className="flex gap-2">
                    <Input value={shareUrl} readOnly className="font-mono text-sm" />
                    <Button
                      onClick={copyToClipboard}
                      variant="outline"
                      size="icon"
                    >
                      {copied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={generateShareToken}
                    disabled={isGenerating}
                    variant="outline"
                    className="flex-1"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generujem...
                      </>
                    ) : (
                      "Vygenerovať nový odkaz"
                    )}
                  </Button>
                  <Button
                    onClick={disableSharing}
                    disabled={isGenerating}
                    variant="destructive"
                    className="flex-1"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Deaktivujem...
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4 mr-2" />
                        Deaktivovať zdieľanie
                      </>
                    )}
                  </Button>
                </div>

                <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                  <p className="font-medium mb-1">⚠️ Bezpečnostné upozornenie:</p>
                  <p>
                    Tento odkaz je verejný a prístupný každému, kto ho má. 
                    Zdieľajte ho iba s dôveryhodnými osobami. Odkaz zobrazuje iba základné informácie o úlohe.
                  </p>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Táto úloha ešte nie je zdieľateľná. Vygenerujte zdieľací odkaz.
                </p>
                <Button
                  onClick={generateShareToken}
                  disabled={isGenerating}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generujem odkaz...
                    </>
                  ) : (
                    <>
                      <Share2 className="h-4 w-4 mr-2" />
                      Vygenerovať zdieľací odkaz
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

