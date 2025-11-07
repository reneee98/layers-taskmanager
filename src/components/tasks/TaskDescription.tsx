"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

// Custom debounce hook
const useDebounce = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedFn = useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    }) as T,
    [callback, delay]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedFn;
};

interface TaskDescriptionProps {
  taskId: string;
  initialDescription?: string;
}

type SaveStatus = "idle" | "typing" | "saving" | "saved" | "error";

const DRAFT_KEY_PREFIX = "draft-";
const DEBOUNCE_MS = 700;

export const TaskDescription = ({ taskId, initialDescription = "" }: TaskDescriptionProps) => {
  const [description, setDescription] = useState<string>(initialDescription);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const draftKey = `${DRAFT_KEY_PREFIX}${taskId}`;
  const isInitialMount = useRef(true);
  const lastSavedDescription = useRef<string>(initialDescription);
  const channelRef = useRef<any>(null);

  // Load draft from localStorage on mount
  useEffect(() => {
    if (isInitialMount.current) {
      const draft = localStorage.getItem(draftKey);
      if (draft) {
        setDescription(draft);
        setStatus("idle");
      }
      isInitialMount.current = false;
    }
  }, [draftKey]);

  // Save to localStorage whenever description changes
  useEffect(() => {
    if (!isInitialMount.current) {
      localStorage.setItem(draftKey, description);
    }
  }, [description, draftKey]);

  // Cleanup: Save current text to localStorage on unmount if not saved
  useEffect(() => {
    return () => {
      if (description !== lastSavedDescription.current) {
        localStorage.setItem(draftKey, description);
      }
    };
  }, [description, draftKey]);

  // Save function
  const saveDescriptionFn = useCallback(
    async (text: string) => {
      if (text === lastSavedDescription.current) {
        setStatus("saved");
        return;
      }

      setStatus("saving");
      setError(null);

      try {
        const { error: updateError } = await supabase
          .from("tasks")
          .update({ description: text.trim() || null })
          .eq("id", taskId);

        if (updateError) {
          throw updateError;
        }

        lastSavedDescription.current = text;
        localStorage.removeItem(draftKey); // Remove draft after successful save
        setStatus("saved");
        
        // Reset to idle after 2 seconds
        setTimeout(() => {
          setStatus((prev) => (prev === "saved" ? "idle" : prev));
        }, 2000);
      } catch (err) {
        console.error("Error saving description:", err);
        setError(err instanceof Error ? err.message : "Nepodarilo sa uložiť popis");
        setStatus("error");
      }
    },
    [taskId, supabase, draftKey]
  );

  // Debounced save function
  const saveDescription = useDebounce(saveDescriptionFn, DEBOUNCE_MS);

  // Handle description change
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newDescription = e.target.value;
      setDescription(newDescription);
      setStatus("typing");
      saveDescription(newDescription);
    },
    [saveDescription]
  );

  // Setup realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`task-description-${taskId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tasks",
          filter: `id=eq.${taskId}`,
        },
        (payload) => {
          const newDescription = (payload.new as any).description || "";
          
          // Only update if the change didn't come from this component
          if (newDescription !== lastSavedDescription.current) {
            setDescription(newDescription);
            lastSavedDescription.current = newDescription;
            localStorage.removeItem(draftKey);
            setStatus("saved");
            
            setTimeout(() => {
              setStatus((prev) => (prev === "saved" ? "idle" : prev));
            }, 2000);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId, supabase, draftKey]);

  // Update when initialDescription changes externally
  useEffect(() => {
    if (initialDescription !== lastSavedDescription.current) {
      setDescription(initialDescription);
      lastSavedDescription.current = initialDescription;
    }
  }, [initialDescription]);

  const getStatusText = () => {
    switch (status) {
      case "typing":
        return "Píšeš...";
      case "saving":
        return "Ukladám...";
      case "saved":
        return "Uložené";
      case "error":
        return `Chyba: ${error || "Nepodarilo sa uložiť"}`;
      default:
        return "";
    }
  };

  const statusColor = status === "error" ? "text-red-500" : status === "saved" ? "text-green-500" : "text-muted-foreground";

  return (
    <div className="space-y-2">
      <textarea
        value={description}
        onChange={handleChange}
        placeholder="Napíšte popis úlohy..."
        className="w-full min-h-[150px] p-3 border rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-primary"
        rows={6}
      />
      {status !== "idle" && (
        <small className={`block text-sm ${statusColor}`}>
          {getStatusText()}
        </small>
      )}
    </div>
  );
};

