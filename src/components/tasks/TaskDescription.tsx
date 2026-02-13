"use client";

import { useState, useEffect, useCallback, useRef, type MouseEvent as ReactMouseEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { useEditor, EditorContent } from "@tiptap/react";
import { posToDOMRect } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { 
  Bold, 
  Italic, 
  Strikethrough, 
  Code,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Quote,
  Code2,
  Type
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  onStatusChange?: (status: SaveStatus, text: string) => void;
}

type SaveStatus = "idle" | "typing" | "saving" | "saved" | "error";

const DRAFT_KEY_PREFIX = "draft-";
const DEBOUNCE_MS = 700;

export const TaskDescription = ({ taskId, initialDescription = "", onStatusChange }: TaskDescriptionProps) => {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const draftKey = `${DRAFT_KEY_PREFIX}${taskId}`;
  const isInitialMount = useRef(true);
  const lastSavedDescription = useRef<string>(initialDescription);
  const channelRef = useRef<any>(null);
  const isSavingRef = useRef(false);
  const lastSelectionRef = useRef<{ from: number; to: number } | null>(null);
  const bubbleMenuRef = useRef<HTMLDivElement | null>(null);
  const [bubbleMenuState, setBubbleMenuState] = useState({
    isVisible: false,
    left: 0,
    top: 0,
  });

  // Initialize Tiptap editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: false, // Disable default link to avoid duplicate
      }),
      Placeholder.configure({
        placeholder: "Napíšte popis úlohy...",
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline hover:text-primary/80",
        },
      }),
    ],
    content: initialDescription || "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none",
      },
      handleDOMEvents: {
        blur: () => {
          return false; // Allow default behavior
        },
        focus: () => {
          return false; // Allow default behavior
        },
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      
      // Save to localStorage
      if (!isInitialMount.current) {
        localStorage.setItem(draftKey, html);
      }
      
      // Preserve selection
      const { from, to } = editor.state.selection;
      if (from !== to) {
        lastSelectionRef.current = { from, to };
      } else {
        lastSelectionRef.current = null;
      }
      
      // Update status without affecting BubbleMenu
      setStatus("typing");
      saveDescription(html);
    },
  });

  // Load draft from localStorage on mount
  useEffect(() => {
    if (isInitialMount.current && editor) {
      const draft = localStorage.getItem(draftKey);
      if (draft) {
        editor.commands.setContent(draft, { emitUpdate: false });
        setStatus("idle");
      }
      isInitialMount.current = false;
    }
  }, [editor, draftKey]);

  // Update editor when initialDescription changes externally
  useEffect(() => {
    if (!editor) return;

    const nextDescription = initialDescription || "";
    if (nextDescription === lastSavedDescription.current) {
      return;
    }

    // Don't replace content while user actively edits/has selection.
    if (editor.isFocused) {
      return;
    }

    editor.commands.setContent(nextDescription, { emitUpdate: false });
    lastSavedDescription.current = nextDescription;
  }, [editor, initialDescription]);


  // Save function - use API endpoint instead of direct Supabase client to handle RLS properly
  const saveDescriptionFn = useCallback(
    async (html: string) => {
      if (html === lastSavedDescription.current) {
        setStatus("saved");
        return;
      }

      setStatus("saving");
      setError(null);
      isSavingRef.current = true;

      try {
        const response = await fetch(`/api/tasks/${taskId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            description: html.trim() || null,
          }),
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Nepodarilo sa uložiť popis");
        }

        lastSavedDescription.current = html;
        localStorage.removeItem(draftKey); // Remove draft after successful save
        setStatus("saved");
        
        // Reset to idle after 2 seconds
        setTimeout(() => {
          isSavingRef.current = false;
          setStatus((prev) => {
            if (prev === "saved") {
              return "idle";
            }
            return prev;
          });
        }, 2000);
      } catch (err) {
        console.error("[TaskDescription] Error saving description:", err);
        setError(err instanceof Error ? err.message : "Nepodarilo sa uložiť popis");
        setStatus("error");
      } finally {
        isSavingRef.current = false;
      }
    },
    [taskId, draftKey, editor]
  );

  // Debounced save function
  const saveDescription = useDebounce(saveDescriptionFn, DEBOUNCE_MS);

  // Setup realtime subscription
  useEffect(() => {
    if (!editor) return;

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
          const incomingDescription = (payload.new.description as string) || "";
          const currentContent = editor.getHTML();

          // Typical local-save echo from realtime channel; don't reset selection/content.
          if (incomingDescription === currentContent) {
            lastSavedDescription.current = incomingDescription;
            return;
          }

          // Avoid replacing document while user is focused in editor.
          if (editor.isFocused || isSavingRef.current) {
            return;
          }

          lastSavedDescription.current = incomingDescription;
          editor.commands.setContent(incomingDescription, { emitUpdate: false });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [editor, taskId, supabase]);

  // Notify parent of status changes
  useEffect(() => {
    if (onStatusChange && editor) {
      const text = editor.getText();
      onStatusChange(status, text);
    }
  }, [status, editor, onStatusChange]);

  // Save draft on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (editor) {
        const html = editor.getHTML();
        localStorage.setItem(draftKey, html);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [editor, draftKey]);

  const updateBubbleMenuState = useCallback(() => {
    if (!editor) return;

    const { from, to } = editor.state.selection;
    const hasSelection = editor.isEditable && from !== to;

    if (!hasSelection) {
      lastSelectionRef.current = null;
      setBubbleMenuState((prev) => (prev.isVisible ? { ...prev, isVisible: false } : prev));
      return;
    }

    lastSelectionRef.current = { from, to };
    const selectionRect = posToDOMRect(editor.view, from, to);

    setBubbleMenuState({
      isVisible: true,
      left: selectionRect.left + selectionRect.width / 2,
      top: selectionRect.top - 8,
    });
  }, [editor]);

  const handleBubbleMenuMouseDown = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      // Keep text selection active while interacting with toolbar buttons.
      event.preventDefault();

      if (editor && lastSelectionRef.current) {
        editor.commands.setTextSelection(lastSelectionRef.current);
      }
    },
    [editor]
  );

  useEffect(() => {
    if (!editor) return;

    const handleBlur = ({ event }: { event: FocusEvent }) => {
      const relatedTarget = event?.relatedTarget;
      if (relatedTarget instanceof Node && bubbleMenuRef.current?.contains(relatedTarget)) {
        return;
      }

      setBubbleMenuState((prev) => (prev.isVisible ? { ...prev, isVisible: false } : prev));
    };

    const handleDocumentMouseDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;

      if (bubbleMenuRef.current?.contains(target)) return;
      if (editor.view.dom.contains(target)) return;

      lastSelectionRef.current = null;
      setBubbleMenuState((prev) => (prev.isVisible ? { ...prev, isVisible: false } : prev));
    };

    editor.on("selectionUpdate", updateBubbleMenuState);
    editor.on("transaction", updateBubbleMenuState);
    editor.on("focus", updateBubbleMenuState);
    editor.on("blur", handleBlur);
    window.addEventListener("resize", updateBubbleMenuState);
    document.addEventListener("scroll", updateBubbleMenuState, true);
    document.addEventListener("mousedown", handleDocumentMouseDown, true);

    updateBubbleMenuState();

    return () => {
      editor.off("selectionUpdate", updateBubbleMenuState);
      editor.off("transaction", updateBubbleMenuState);
      editor.off("focus", updateBubbleMenuState);
      editor.off("blur", handleBlur);
      window.removeEventListener("resize", updateBubbleMenuState);
      document.removeEventListener("scroll", updateBubbleMenuState, true);
      document.removeEventListener("mousedown", handleDocumentMouseDown, true);
    };
  }, [editor, updateBubbleMenuState]);

  if (!editor) {
    return <div className="h-32 bg-muted animate-pulse rounded"></div>;
  }

  return (
    <div className="w-full">
      <EditorContent editor={editor} />
      <style jsx global>{`
        .ProseMirror {
          outline: none;
          border: 1px solid hsl(var(--input));
          background-color: hsl(var(--background));
          border-radius: calc(var(--radius) - 2px);
          min-height: 150px;
          padding: 0.75rem;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .ProseMirror:focus {
          outline: none;
          border-color: hsl(var(--ring));
          box-shadow: 0 0 0 2px hsl(var(--ring) / 0.2);
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: hsl(var(--muted-foreground));
          pointer-events: none;
          height: 0;
        }
        .ProseMirror p {
          margin: 0.5rem 0;
        }
        .ProseMirror ul, .ProseMirror ol {
          padding-left: 1.5rem;
          margin: 0.5rem 0;
          list-style-position: outside;
        }
        .ProseMirror ul {
          list-style-type: disc;
        }
        .ProseMirror ol {
          list-style-type: decimal;
        }
        .ProseMirror li {
          margin: 0.25rem 0;
          display: list-item;
          list-style-position: outside;
        }
        .ProseMirror li p {
          margin: 0;
          display: inline;
        }
        .ProseMirror code {
          background: hsl(var(--muted));
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 0.875rem;
        }
        .ProseMirror pre {
          background: hsl(var(--muted));
          padding: 1rem;
          border-radius: 0.5rem;
          margin: 1rem 0;
          overflow-x: auto;
        }
        .ProseMirror pre code {
          background: transparent;
          padding: 0;
        }
        .ProseMirror blockquote {
          border-left: 4px solid hsl(var(--primary));
          padding-left: 1rem;
          margin: 1rem 0;
          color: hsl(var(--muted-foreground));
          background: hsl(var(--muted/30));
          padding: 0.75rem 1rem;
          border-radius: 0 0.5rem 0.5rem 0;
        }
        .ProseMirror a {
          color: hsl(var(--primary));
          text-decoration: underline;
          cursor: pointer;
        }
        .ProseMirror a:hover {
          color: hsl(var(--primary/80));
        }
        .ProseMirror strong {
          font-weight: 600;
        }
        .ProseMirror h1 {
          font-size: 1.5rem;
          font-weight: 600;
          margin: 0.75rem 0 0.5rem 0;
        }
        .ProseMirror h2 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0.75rem 0 0.5rem 0;
        }
        .ProseMirror h3 {
          font-size: 1.125rem;
          font-weight: 600;
          margin: 0.75rem 0 0.5rem 0;
        }
      `}</style>
      {/* Bubble Menu - appears when text is selected */}
      {bubbleMenuState.isVisible && (
        <div
          ref={bubbleMenuRef}
          onMouseDown={handleBubbleMenuMouseDown}
          onMouseDownCapture={handleBubbleMenuMouseDown}
          style={{
            position: "fixed",
            left: `${bubbleMenuState.left}px`,
            top: `${bubbleMenuState.top}px`,
            transform: "translate(-50%, -100%)",
          }}
          className="flex items-center gap-1 p-1 bg-background border border-border rounded-lg shadow-lg z-[10000]"
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive("bold") && "bg-accent"
            )}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Tučné (Ctrl+B)"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive("italic") && "bg-accent"
            )}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Kurzíva (Ctrl+I)"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive("strike") && "bg-accent"
            )}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="Prečiarknuté"
          >
            <Strikethrough className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive("code") && "bg-accent"
            )}
            onClick={() => editor.chain().focus().toggleCode().run()}
            title="Kód"
          >
            <Code className="h-4 w-4" />
          </Button>
          <div className="h-6 w-px bg-border mx-1" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive("bulletList") && "bg-accent"
            )}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Zoznam s odrážkami"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive("orderedList") && "bg-accent"
            )}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Číslovaný zoznam"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <div className="h-6 w-px bg-border mx-1" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive("heading", { level: 1 }) && "bg-accent"
            )}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            title="Nadpis 1"
          >
            <Heading1 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive("heading", { level: 2 }) && "bg-accent"
            )}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            title="Nadpis 2"
          >
            <Heading2 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive("heading", { level: 3 }) && "bg-accent"
            )}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            title="Nadpis 3"
          >
            <Heading3 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive("heading", { level: 4 }) && "bg-accent"
            )}
            onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
            title="Nadpis 4"
          >
            <Heading4 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive("paragraph") && "bg-accent"
            )}
            onClick={() => editor.chain().focus().setParagraph().run()}
            title="Paragraf"
          >
            <Type className="h-4 w-4" />
          </Button>
          <div className="h-6 w-px bg-border mx-1" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive("blockquote") && "bg-accent"
            )}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            title="Citát"
          >
            <Quote className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive("codeBlock") && "bg-accent"
            )}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            title="Blok kódu"
          >
            <Code2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
