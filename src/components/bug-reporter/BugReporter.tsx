"use client";

import { useState } from "react";
import { Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export const BugReporter = () => {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast({
        title: "Chyba",
        description: "Prosím, zadajte popis bugu",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Get current URL with full path
      const url = typeof window !== "undefined" 
        ? window.location.href 
        : "";

      console.log("Submitting bug report from URL:", url);

      const response = await fetch("/api/bugs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: description.trim(),
          url: url,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Nepodarilo sa odoslať bug report");
      }

      toast({
        title: "Úspech",
        description: "Bug report bol úspešne odoslaný. Ďakujeme!",
      });

      // Reset form and close dialog
      setDescription("");
      setOpen(false);
    } catch (error) {
      console.error("Error submitting bug report:", error);
      toast({
        title: "Chyba",
        description: error instanceof Error ? error.message : "Nepodarilo sa odoslať bug report",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="default"
          size="icon"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 hover:scale-110 transition-transform"
          aria-label="Nahlásiť bug"
          tabIndex={0}
        >
          <Bug className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nahlásiť bug</DialogTitle>
          <DialogDescription>
            Popíšte problém, ktorý ste našli. Váš report pomôže zlepšiť aplikáciu.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Textarea
            id="bug-description"
            placeholder="Popíšte bug, ktorý ste našli..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            className="resize-none"
            autoComplete="off"
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setOpen(false);
              setDescription("");
            }}
            disabled={isSubmitting}
          >
            Zrušiť
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !description.trim()}
          >
            {isSubmitting ? "Odosielam..." : "Odoslať"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

