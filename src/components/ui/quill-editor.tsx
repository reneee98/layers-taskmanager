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
    if (onChange) {
      // Získame HTML obsah z Quill editora
      const quill = quillRef.current?.getEditor();
      const html = quill ? quill.root.innerHTML : value;
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

  // Custom image handler
  const selectLocalImage = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (file && taskId) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('task_id', taskId);
          
          const response = await fetch('/api/files/upload', {
            method: 'POST',
            body: formData,
          });
          
          if (response.ok) {
            const { data } = await response.json();
            
            // Get the public URL for the image
            const supabase = (await import('@/lib/supabase/client')).createClient();
            const { data: urlData } = supabase.storage
              .from('task-files')
              .getPublicUrl(data.file_path);
            
            // Insert image into Quill
            const quill = quillRef.current?.getEditor();
            if (quill) {
              const range = quill.getSelection();
              quill.insertEmbed(range?.index || 0, 'image', urlData.publicUrl);
            }
          } else {
            console.error('Upload failed:', response.status, await response.text());
          }
        } catch (error) {
          console.error('Error uploading image:', error);
        }
      }
    };
  };

  // Set up custom image handler
  useEffect(() => {
    if (quillRef.current && editable) {
      const quill = quillRef.current.getEditor();
      const toolbar = quill.getModule('toolbar');
      
      toolbar.addHandler('image', selectLocalImage);
    }
  }, [editable, taskId]);

  if (!editable) {
    return (
      <div 
        className={cn("border rounded-lg p-3 prose prose-sm max-w-none", className)}
        dangerouslySetInnerHTML={{ __html: content }}
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
