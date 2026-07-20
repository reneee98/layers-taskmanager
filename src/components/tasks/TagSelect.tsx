"use client";

import { useState, useEffect, useRef } from "react";
import { Tag, X, Plus, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tag as TagType } from "@/types/database";

// Predefined color palette for tags
export const TAG_COLORS = [
  { label: "Šedá",    value: "#64748b" },
  { label: "Červená", value: "#ef4444" },
  { label: "Oranžová",value: "#f97316" },
  { label: "Žltá",   value: "#eab308" },
  { label: "Zelená",  value: "#22c55e" },
  { label: "Tyrkys",  value: "#14b8a6" },
  { label: "Modrá",   value: "#3b82f6" },
  { label: "Indigová",value: "#6366f1" },
  { label: "Fialová", value: "#a855f7" },
  { label: "Ružová",  value: "#ec4899" },
];

interface TagBadgeProps {
  tag: TagType;
  onRemove?: () => void;
  size?: "sm" | "xs";
}

export function TagBadge({ tag, onRemove, size = "sm" }: TagBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium",
        size === "xs" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]"
      )}
      style={{
        backgroundColor: tag.color + "22",
        color: tag.color,
        border: `1px solid ${tag.color}44`,
      }}
    >
      {tag.name}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="rounded-full opacity-60 hover:opacity-100 transition-opacity"
          aria-label={`Odstrániť tag ${tag.name}`}
        >
          <X className={size === "xs" ? "h-2.5 w-2.5" : "h-3 w-3"} />
        </button>
      )}
    </span>
  );
}

interface TagSelectProps {
  taskId: string;
  currentTags: TagType[];
  onTagsChange: (tags: TagType[]) => void;
  disabled?: boolean;
}

export function TagSelect({ taskId, currentTags, onTagsChange, disabled }: TagSelectProps) {
  const [open, setOpen] = useState(false);
  const [allTags, setAllTags] = useState<TagType[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[7].value);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) fetchAllTags();
  }, [open]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setIsCreating(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const fetchAllTags = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/tags");
      const result = await res.json();
      if (result.success) setAllTags(result.data);
    } finally {
      setIsLoading(false);
    }
  };

  const isSelected = (tag: TagType) => currentTags.some((t) => t.id === tag.id);

  const toggleTag = async (tag: TagType) => {
    if (isSelected(tag)) {
      await fetch(`/api/tasks/${taskId}/tags?tagId=${tag.id}`, { method: "DELETE" });
      onTagsChange(currentTags.filter((t) => t.id !== tag.id));
    } else {
      await fetch(`/api/tasks/${taskId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagId: tag.id }),
      });
      onTagsChange([...currentTags, tag]);
    }
  };

  const createAndAdd = async () => {
    const name = search.trim();
    if (!name) return;
    setIsCreating(true);
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color: newTagColor }),
      });
      const result = await res.json();
      if (result.success) {
        const newTag = result.data as TagType;
        setAllTags((prev) => [...prev, newTag]);
        await fetch(`/api/tasks/${taskId}/tags`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tagId: newTag.id }),
        });
        onTagsChange([...currentTags, newTag]);
        setSearch("");
      }
    } finally {
      setIsCreating(false);
    }
  };

  const filtered = allTags.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );
  const canCreate = search.trim().length > 0 && !filtered.some(
    (t) => t.name.toLowerCase() === search.trim().toLowerCase()
  );

  return (
    <div ref={dropdownRef} className="relative">
      <div className="flex flex-wrap items-center gap-1.5">
        {currentTags.map((tag) => (
          <TagBadge
            key={tag.id}
            tag={tag}
            size="xs"
            onRemove={disabled ? undefined : () => toggleTag(tag)}
          />
        ))}
        {!disabled && (
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1 rounded-full border border-dashed border-border px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
          >
            <Plus className="h-2.5 w-2.5" />
            Pridať
          </button>
        )}
        {currentTags.length === 0 && disabled && (
          <span className="text-xs text-muted-foreground/50">—</span>
        )}
      </div>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-56 rounded-xl border border-border bg-popover shadow-lg">
          {/* Search / create input */}
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Tag className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canCreate) createAndAdd();
                if (e.key === "Escape") setOpen(false);
              }}
              placeholder="Hľadať alebo vytvoriť..."
              className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
            />
            {isCreating && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          </div>

          {/* Tag list */}
          <div className="max-h-48 overflow-y-auto py-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {filtered.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag)}
                    className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-xs hover:bg-muted transition-colors"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="flex-1 truncate text-foreground">{tag.name}</span>
                    {isSelected(tag) && (
                      <Check className="h-3 w-3 shrink-0 text-brand" />
                    )}
                  </button>
                ))}

                {/* Create new tag option */}
                {canCreate && (
                  <div className="border-t border-border/60 mt-1 pt-1">
                    <div className="flex items-center gap-2 px-3 py-1">
                      <button
                        onClick={() => setShowColorPicker((v) => !v)}
                        className="h-4 w-4 rounded-full shrink-0 border border-border/60 transition-transform hover:scale-110"
                        style={{ backgroundColor: newTagColor }}
                        title="Zmeniť farbu"
                      />
                      <button
                        onClick={createAndAdd}
                        className="flex-1 text-left text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Vytvoriť <span className="font-medium text-foreground">"{search.trim()}"</span>
                      </button>
                    </div>
                    {showColorPicker && (
                      <div className="flex flex-wrap gap-1.5 px-3 pb-2">
                        {TAG_COLORS.map((c) => (
                          <button
                            key={c.value}
                            onClick={() => { setNewTagColor(c.value); setShowColorPicker(false); }}
                            className={cn(
                              "h-4 w-4 rounded-full border-2 transition-transform hover:scale-110",
                              newTagColor === c.value ? "border-foreground" : "border-transparent"
                            )}
                            style={{ backgroundColor: c.value }}
                            title={c.label}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {filtered.length === 0 && !canCreate && (
                  <p className="px-3 py-3 text-center text-xs text-muted-foreground">
                    Žiadne tagy
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
