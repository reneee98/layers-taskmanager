"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Bold, 
  Italic, 
  Strikethrough, 
  Code, 
  List, 
  ListOrdered, 
  Quote, 
  Undo, 
  Redo
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  content?: string;
  onChange?: (content: string, html: string) => void;
  placeholder?: string;
  className?: string;
  editable?: boolean;
}

export function RichTextEditor({ 
  content = "", 
  onChange, 
  placeholder = "Napíšte komentár...",
  className,
  editable = true
}: RichTextEditorProps) {
  const [text, setText] = useState(content);
  const [history, setHistory] = useState<string[]>([content]);
  const [historyIndex, setHistoryIndex] = useState(0);

  useEffect(() => {
    setText(content);
  }, [content]);

  const formatText = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/~~(.*?)~~/g, '<del>$1</del>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/^\- (.*$)/gim, '<li>$1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
      .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
      .replace(/\n/g, '<br>');
  };

  const handleTextChange = (newText: string) => {
    setText(newText);
    if (onChange) {
      const html = formatText(newText);
      onChange(newText, html);
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setText(history[newIndex]);
      if (onChange) {
        onChange(history[newIndex], history[newIndex]);
      }
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setText(history[newIndex]);
      if (onChange) {
        onChange(history[newIndex], history[newIndex]);
      }
    }
  };

  const addToHistory = (newText: string) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newText);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'b') {
        e.preventDefault();
        // Bold formatting would go here
      } else if (e.key === 'i') {
        e.preventDefault();
        // Italic formatting would go here
      }
    }
  };

  const ToolbarButton = ({ 
    onClick, 
    isActive, 
    children, 
    title 
  }: { 
    onClick: () => void; 
    isActive?: boolean; 
    children: React.ReactNode;
    title: string;
  }) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={cn(
        "h-8 w-8 p-0",
        isActive && "bg-secondary"
      )}
      title={title}
    >
      {children}
    </Button>
  );

    if (!editable) {
      return (
        <div className={cn("border rounded-lg p-3", className)}>
          <div 
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: markdownToHtml(text) }}
          />
        </div>
      );
    }

  return (
    <div className={cn("border rounded-lg", className)}>
      <div className="flex items-center gap-1 p-2 border-b bg-muted/50">
        <ToolbarButton
          onClick={handleUndo}
          title="Späť (Ctrl+Z)"
        >
          <Undo className="h-4 w-4" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={handleRedo}
          title="Dopredu (Ctrl+Y)"
        >
          <Redo className="h-4 w-4" />
        </ToolbarButton>
        
        <div className="w-px h-6 bg-border mx-1" />
        
        <ToolbarButton
          onClick={() => {
            const newText = text + " **tučný text** ";
            handleTextChange(newText);
            addToHistory(newText);
          }}
          title="Tučné"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => {
            const newText = text + " *kurzíva* ";
            handleTextChange(newText);
            addToHistory(newText);
          }}
          title="Kurzíva"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => {
            const newText = text + " ~~prečiarknuté~~ ";
            handleTextChange(newText);
            addToHistory(newText);
          }}
          title="Prečiarknuté"
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => {
            const newText = text + " `kód` ";
            handleTextChange(newText);
            addToHistory(newText);
          }}
          title="Kód"
        >
          <Code className="h-4 w-4" />
        </ToolbarButton>
        
        <div className="w-px h-6 bg-border mx-1" />
        
        <ToolbarButton
          onClick={() => {
            const newText = text + "\n- odrážka 1\n- odrážka 2\n";
            handleTextChange(newText);
            addToHistory(newText);
          }}
          title="Zoznam s odrážkami"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => {
            const newText = text + "\n1. položka 1\n2. položka 2\n";
            handleTextChange(newText);
            addToHistory(newText);
          }}
          title="Číslovaný zoznam"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        
          <ToolbarButton
            onClick={() => {
              const newText = text + "\n> citácia\n";
              handleTextChange(newText);
              addToHistory(newText);
            }}
            title="Citácia"
          >
            <Quote className="h-4 w-4" />
          </ToolbarButton>
        </div>
      
        <div className="p-3">
          <div className="relative">
            <Textarea
              value={text}
              onChange={(e) => {
                const newText = e.target.value;
                handleTextChange(newText);
                addToHistory(newText);
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="min-h-[100px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent relative z-10"
              style={{ 
                color: 'transparent',
                caretColor: 'hsl(var(--foreground))'
              }}
            />
            <div 
              className="absolute inset-0 p-3 pointer-events-none overflow-hidden prose prose-sm max-w-none"
              style={{ 
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                fontFamily: 'inherit',
                fontSize: 'inherit',
                lineHeight: 'inherit',
                padding: '0.75rem',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                color: 'hsl(var(--foreground))'
              }}
              dangerouslySetInnerHTML={{ __html: formatText(text) }}
            />
          </div>
        </div>
    </div>
  );
}
