"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, Clock, FolderKanban, Building2, FileText, User, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  type: 'project' | 'task' | 'client' | 'invoice';
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
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        setQuery("");
        setResults([]);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
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
      console.error('Search error:', error);
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
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
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
      case 'project': return FolderKanban;
      case 'task': return Clock;
      case 'client': return Building2;
      case 'invoice': return FileText;
      default: return Search;
    }
  };

  // Get badge color for result type
  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'project': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'task': return 'bg-green-100 text-green-700 border-green-200';
      case 'client': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'invoice': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="relative w-full">
      {/* Search Input */}
      <div className="relative w-full">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Hľadať projekty, úlohy, klientov... (Ctrl+K)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="pl-12 pr-12 w-full h-12 text-base bg-white/80 border-gray-200 focus:bg-white focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all duration-200 rounded-xl shadow-sm"
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQuery("");
              setResults([]);
              setSelectedIndex(-1);
            }}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100 rounded-lg"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Search Results */}
      {isOpen && (query || results.length > 0) && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-3 max-h-96 overflow-y-auto shadow-2xl border border-gray-200 rounded-2xl bg-white/95 backdrop-blur-sm">
          <CardContent className="p-2">
            {isLoading ? (
              <div className="p-6 text-center text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-3 text-sm font-medium">Hľadám...</p>
              </div>
            ) : results.length > 0 ? (
              <div className="py-2">
                {results.map((result, index) => {
                  const Icon = getResultIcon(result.type);
                  const isSelected = index === selectedIndex;
                  
                  return (
                    <div
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleResultClick(result)}
                      className={cn(
                        "flex items-center gap-4 p-4 cursor-pointer transition-all duration-200 rounded-xl",
                        isSelected ? "bg-gray-100 shadow-sm" : "hover:bg-gray-50 hover:shadow-sm"
                      )}
                    >
                      <div className="flex-shrink-0">
                        <div className="p-2 rounded-lg bg-gray-100">
                          <Icon className="h-4 w-4 text-gray-600" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-semibold text-gray-900 truncate text-base">
                            {result.title}
                          </h4>
                          <Badge 
                            variant="outline" 
                            className={`text-xs px-2 py-1 rounded-full ${getBadgeColor(result.type)}`}
                          >
                            {result.badge || result.type}
                          </Badge>
                        </div>
                        {result.subtitle && (
                          <p className="text-sm text-gray-600 truncate">
                            {result.subtitle}
                          </p>
                        )}
                        {result.description && (
                          <p className="text-sm text-gray-500 truncate">
                            {result.description}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : query ? (
              <div className="p-6 text-center text-gray-500">
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
