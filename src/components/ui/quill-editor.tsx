"use client";

import { useEffect, useRef, forwardRef } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

// Dynamicky importujeme Quill aby sa nenačítal na serveri
const ReactQuill = dynamic(() => import("react-quill"), { 
  ssr: false,
  loading: () => <div className="min-h-[150px] border rounded-lg p-3 bg-muted/30">Načítavam editor...</div>
});

import "react-quill/dist/quill.snow.css";

interface QuillEditorProps {
  content?: string;
  onChange?: (content: string, html: string) => void;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  className?: string;
  editable?: boolean;
  taskId?: string;
}

export const QuillEditor = forwardRef<HTMLDivElement, QuillEditorProps>(({
  content = "",
  onChange,
  onBlur,
  onKeyDown,
  placeholder = "Napíšte text...",
  className,
  editable = true,
  taskId
}, ref) => {
  const quillRef = useRef<any>(null);
  const lastContentRef = useRef<string>(content);
  const isUserTyping = useRef(false);

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['blockquote', 'code-block'],
      ['link', 'image'],
      ['clean']
    ]
  };

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'blockquote', 'code-block',
    'link', 'image'
  ];

  const handleChange = (value: string) => {
    isUserTyping.current = true;
    console.log('QuillEditor content changed:', value);
    if (onChange) {
      // Získame HTML obsah z Quill editora
      const quill = quillRef.current?.getEditor();
      const html = quill ? quill.root.innerHTML : value;
      console.log('QuillEditor HTML:', html);
      onChange(value, html);
    }
  };

  const handleBlur = () => {
    if (onBlur) {
      onBlur();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  // Custom image handler - redirect to Files section
  const selectLocalImage = () => {
    // Show message that images should be uploaded to Files section
    if (typeof window !== 'undefined') {
      alert('Pre nahrávanie obrázkov použite sekciu "Súbory" nižšie. Obrázky sa automaticky zobrazia v popise úlohy.');
    }
  };

  // Set up custom image handler
  useEffect(() => {
    if (quillRef.current && editable) {
      const quill = quillRef.current.getEditor();
      const toolbar = quill.getModule('toolbar');
      
      toolbar.addHandler('image', selectLocalImage);
    }
  }, [editable, taskId]);

  // Update editor content when content prop changes (only if user is not typing)
  useEffect(() => {
    if (quillRef.current && !isUserTyping.current && content !== lastContentRef.current) {
      console.log('QuillEditor updating content from prop:', content);
      const quill = quillRef.current.getEditor();
      if (quill && quill.root.innerHTML !== content) {
        quill.root.innerHTML = content;
        lastContentRef.current = content;
      }
    }
    // Reset the typing flag after a short delay
    if (isUserTyping.current) {
      const timeout = setTimeout(() => {
        isUserTyping.current = false;
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [content]);




  if (!editable) {
    return (
      <div 
        className={cn("border rounded-lg p-3 prose prose-sm max-w-none", className)}
        dangerouslySetInnerHTML={{ __html: content }}
        style={{
          lineHeight: '1.6',
          color: 'hsl(var(--foreground))'
        }}
      />
    );
  }

  return (
    <div className={cn("border rounded-lg bg-background", className)}>
      <style jsx global>{`
        .ql-toolbar {
          border: none !important;
          border-bottom: 1px solid hsl(var(--border)) !important;
          background: hsl(var(--muted/50)) !important;
          padding: 8px 12px !important;
          border-radius: 0.5rem 0.5rem 0 0 !important;
        }
        
        .ql-container {
          border: none !important;
          font-family: inherit !important;
          font-size: 14px !important;
          border-radius: 0 0 0.5rem 0.5rem !important;
        }
        
        .ql-editor {
          padding: 12px !important;
          min-height: 150px !important;
          color: hsl(var(--foreground)) !important;
          line-height: 1.6 !important;
        }
        
        .ql-editor.ql-blank::before {
          color: hsl(var(--muted-foreground)) !important;
          font-style: normal !important;
        }
        
        .ql-toolbar .ql-stroke {
          stroke: hsl(var(--foreground)) !important;
        }
        
        .ql-toolbar .ql-fill {
          fill: hsl(var(--foreground)) !important;
        }
        
        .ql-toolbar button {
          border-radius: 4px !important;
          margin: 2px !important;
        }
        
        .ql-toolbar button:hover {
          background: hsl(var(--accent)) !important;
        }
        
        .ql-toolbar button.ql-active {
          background: hsl(var(--accent)) !important;
          color: hsl(var(--accent-foreground)) !important;
        }
        
        .ql-editor h1 {
          font-size: 1.5rem !important;
          font-weight: 600 !important;
          margin: 0.75rem 0 0.5rem 0 !important;
          color: hsl(var(--foreground)) !important;
        }
        
        .ql-editor h2 {
          font-size: 1.25rem !important;
          font-weight: 600 !important;
          margin: 0.75rem 0 0.5rem 0 !important;
          color: hsl(var(--foreground)) !important;
        }
        
        .ql-editor h3 {
          font-size: 1.125rem !important;
          font-weight: 600 !important;
          margin: 0.75rem 0 0.5rem 0 !important;
          color: hsl(var(--foreground)) !important;
        }
        
        .ql-editor blockquote {
          border-left: 4px solid hsl(var(--primary)) !important;
          padding-left: 1rem !important;
          margin: 1rem 0 !important;
          color: hsl(var(--muted-foreground)) !important;
          background: hsl(var(--muted/30)) !important;
          padding: 0.75rem 1rem !important;
          border-radius: 0 0.5rem 0.5rem 0 !important;
        }
        
        .ql-editor code {
          background: hsl(var(--muted)) !important;
          padding: 0.125rem 0.375rem !important;
          border-radius: 0.25rem !important;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace !important;
          font-size: 0.875rem !important;
          color: hsl(var(--foreground)) !important;
        }
        
        .ql-editor pre {
          background: hsl(var(--muted)) !important;
          padding: 1rem !important;
          border-radius: 0.5rem !important;
          margin: 1rem 0 !important;
          overflow-x: auto !important;
          border: 1px solid hsl(var(--border)) !important;
        }
        
        .ql-editor ul, .ql-editor ol {
          padding-left: 1.5rem !important;
          margin: 0.5rem 0 !important;
        }
        
        .ql-editor li {
          margin: 0.25rem 0 !important;
        }
        
        .ql-editor a {
          color: hsl(var(--primary)) !important;
          text-decoration: underline !important;
        }
        
        .ql-editor a:hover {
          color: hsl(var(--primary/80)) !important;
        }
        
        .ql-editor strong {
          font-weight: 600 !important;
        }
        
        .ql-editor em {
          font-style: italic !important;
        }
        
        .ql-editor u {
          text-decoration: underline !important;
        }
        
        .ql-editor s {
          text-decoration: line-through !important;
        }
        
        .ql-editor img {
          max-width: 100% !important;
          height: auto !important;
          margin: 8px 0 !important;
          border-radius: 8px !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
          transition: transform 0.2s ease !important;
          display: block !important;
        }
        
        .ql-editor img:hover {
          transform: scale(1.02) !important;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2) !important;
        }
        
        /* Ensure images are visible in Quill */
        .ql-editor .ql-image {
          display: block !important;
        }
        
        /* Styles for read-only mode */
        .prose img {
          max-width: 100% !important;
          height: auto !important;
          margin: 8px 0 !important;
          border-radius: 8px !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
          transition: transform 0.2s ease !important;
        }
        
        .prose img:hover {
          transform: scale(1.02) !important;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2) !important;
        }
        
        .prose a {
          color: hsl(var(--primary)) !important;
          text-decoration: underline !important;
        }
        
        .prose a:hover {
          color: hsl(var(--primary/80)) !important;
        }
        
        .prose strong {
          font-weight: 600 !important;
        }
        
        .prose em {
          font-style: italic !important;
        }
        
        .prose h1, .prose h2, .prose h3 {
          color: hsl(var(--foreground)) !important;
          font-weight: 600 !important;
        }
        
        .prose blockquote {
          border-left: 4px solid hsl(var(--primary)) !important;
          background: hsl(var(--muted/30)) !important;
          color: hsl(var(--muted-foreground)) !important;
        }
        
        /* Paste animation */
        .ql-editor.paste-animation {
          animation: pasteGlow 1s ease-in-out;
        }
        
        @keyframes pasteGlow {
          0% {
            background-color: hsl(var(--muted/30));
            box-shadow: 0 0 0 0 hsl(var(--primary/20));
          }
          50% {
            background-color: hsl(var(--primary/10));
            box-shadow: 0 0 20px 5px hsl(var(--primary/30));
          }
          100% {
            background-color: hsl(var(--muted/30));
            box-shadow: 0 0 0 0 hsl(var(--primary/20));
          }
        }
        
        /* Drag over animation */
        .ql-editor.drag-over {
          background-color: hsl(var(--primary/10)) !important;
          border: 2px dashed hsl(var(--primary)) !important;
          border-radius: 8px !important;
          transition: all 0.3s ease !important;
        }
      `}</style>
      <div onKeyDown={handleKeyDown}>
        <ReactQuill
          theme="snow"
          value={content}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          modules={modules}
          formats={formats}
          readOnly={!editable}
          style={{
            minHeight: '150px'
          }}
        />
      </div>
    </div>
  );
});

QuillEditor.displayName = "QuillEditor";
