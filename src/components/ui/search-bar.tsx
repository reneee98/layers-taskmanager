"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, Clock, FolderKanban, Building2, FileText, Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, stripHtml } from "@/lib/utils";

interface SearchResult {
  id: string;
  type: "project" | "task" | "client" | "invoice";
  title: string;
  subtitle?: string;
  description?: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
}

interface SearchBarProps {
  onResultClick?: (result: SearchResult) => void;
}

export const SearchBar = ({ onResultClick }: SearchBarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        setQuery("");
        setResults([]);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Search function
  const search = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();

      if (data.success) {
        setResults(data.results || []);
      } else {
        setResults([]);
      }
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim()) {
        search(query);
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleResultClick(results[selectedIndex]);
        }
        break;
    }
  };

  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    onResultClick?.(result);
    setIsOpen(false);
    setQuery("");
    setResults([]);
    setSelectedIndex(-1);

    // Navigate to result
    window.location.href = result.url;
  };

  // Get icon for result type
  const getResultIcon = (type: string) => {
    switch (type) {
      case "project":
        return FolderKanban;
      case "task":
        return Clock;
      case "client":
        return Building2;
      case "invoice":
        return FileText;
      default:
        return Search;
    }
  };

  // Get badge color for result type
  const getBadgeColor = (type: string) => {
    switch (type) {
      case "project":
        return "text-blue-600 dark:text-blue-400";
      case "task":
        return "text-emerald-600 dark:text-emerald-400";
      case "client":
        return "text-amber-600 dark:text-amber-400";
      case "invoice":
        return "text-orange-600 dark:text-orange-400";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="relative w-full max-w-[420px]">
      {/* Search Input */}
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Hľadať projekty..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="h-8 border-transparent bg-muted/70 pl-9 pr-[82px] text-sm text-foreground placeholder:text-muted-foreground hover:bg-muted focus-visible:border-border focus-visible:bg-card focus-visible:ring-0"
        />
        {/* Keyboard shortcut badge */}
        <div className="absolute right-2 top-1/2 flex h-5 -translate-y-1/2 items-center gap-1 rounded border border-border bg-card px-1.5 text-muted-foreground">
          <Command className="h-2.5 w-2.5 text-muted-foreground" />
          <span className="text-[10px] font-bold leading-4 text-muted-foreground">K</span>
        </div>
        {query && (
          <Button
            variant="ghost"
            size="sm"
            aria-label="Vymazať vyhľadávanie"
            onClick={() => {
              setQuery("");
              setResults([]);
              setSelectedIndex(-1);
            }}
            className="absolute right-[40px] top-1/2 h-6 w-6 -translate-y-1/2 p-0 hover:bg-transparent"
          >
            <X className="h-3 w-3 text-muted-foreground" />
          </Button>
        )}
      </div>

      {/* Search Results */}
      {isOpen && (query || results.length > 0) && (
        <Card className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto bg-popover shadow-[0_18px_50px_hsl(0_0%_0%/0.22)]">
          <CardContent className="p-2">
            {isLoading ? (
              <div className="p-6 text-center text-muted-foreground">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-foreground mx-auto"></div>
                <p className="mt-3 text-sm font-medium">Hľadám...</p>
              </div>
            ) : results.length > 0 ? (
              <div className="py-1">
                {results.map((result, index) => {
                  const Icon = getResultIcon(result.type);
                  const isSelected = index === selectedIndex;

                  return (
                    <button
                      type="button"
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleResultClick(result)}
                      className={cn(
                        "flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                        isSelected ? "bg-accent" : "hover:bg-accent/60"
                      )}
                    >
                      <div className="flex-shrink-0">
                        <div className="rounded-md border border-border bg-card p-1.5">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="mb-0.5 flex items-center gap-2">
                          <h4 className="truncate text-sm font-medium text-foreground">
                            {stripHtml(result.title)}
                          </h4>
                          <Badge
                            variant="outline"
                            className={`bg-transparent px-1.5 py-0 text-[10px] ${getBadgeColor(result.type)}`}
                          >
                            {result.badge || result.type}
                          </Badge>
                        </div>
                        {result.subtitle && (
                          <p className="truncate text-xs text-muted-foreground">
                            {stripHtml(result.subtitle)}
                          </p>
                        )}
                        {result.description && (
                          <p className="truncate text-xs text-muted-foreground">
                            {stripHtml(result.description)}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : query ? (
              <div className="p-6 text-center text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-3 opacity-50" />
                <p className="text-base font-medium">Žiadne výsledky pre "{query}"</p>
                <p className="text-sm mt-1">Skúste iný výraz</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
