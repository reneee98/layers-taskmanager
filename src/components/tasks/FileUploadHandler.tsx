"use client";

import { useCallback, useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";
import { compressImageWithTinyJPG, isTinyJPGAvailable } from "@/lib/tinyjpg";
import { compressFile, shouldCompressFile, getCompressionInfo } from "@/lib/universal-compression";

interface FileUploadHandlerProps {
  taskId: string;
  onFileUploaded: (fileUrl: string, htmlContent: string) => void;
  children: React.ReactNode;
}

export const FileUploadHandler = ({ taskId, onFileUploaded, children }: FileUploadHandlerProps) => {
  const [dragActive, setDragActive] = useState(false);

  const compressFileUniversal = async (file: File): Promise<{ compressedFile: File; compressionInfo: string }> => {
    // Check if file should be compressed
    if (!shouldCompressFile(file)) {
      return {
        compressedFile: file,
        compressionInfo: 'Súbor je príliš malý alebo už komprimovaný'
      };
    }

    // For images, try TinyJPG first, then fallback to universal compression
    if (file.type.startsWith('image/') && isTinyJPGAvailable()) {
      try {
        const tinyJPGFile = await compressImageWithTinyJPG(file);
        const originalSize = file.size;
        const compressedSize = tinyJPGFile.size;
        const compressionRatio = Math.round((1 - compressedSize / originalSize) * 100);
        
        return {
          compressedFile: tinyJPGFile,
          compressionInfo: `${(originalSize / 1024 / 1024).toFixed(1)}MB → ${(compressedSize / 1024 / 1024).toFixed(1)}MB (${compressionRatio}% úspora) via TinyJPG`
        };
      } catch (error) {
        console.warn('TinyJPG compression failed, using universal compression:', error);
      }
    }

    // Use universal compression for all file types
    try {
      const result = await compressFile(file);
      return {
        compressedFile: result.compressedFile,
        compressionInfo: getCompressionInfo(result)
      };
    } catch (error) {
      console.warn('Universal compression failed:', error);
      return {
        compressedFile: file,
        compressionInfo: 'Kompresia zlyhala'
      };
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Chyba",
        description: "Súbor je príliš veľký. Maximálna veľkosť je 10MB.",
        variant: "destructive",
      });
      return;
    }

    // Check file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Chyba",
        description: "Typ súboru nie je podporovaný.",
        variant: "destructive",
      });
      return;
    }

        try {
          // Compress file using universal compression
          const { compressedFile, compressionInfo } = await compressFileUniversal(file);

          const formData = new FormData();
          formData.append("file", compressedFile);

          const response = await fetch(`/api/tasks/${taskId}/files`, {
            method: "POST",
            body: formData,
            credentials: "include",
          });

          const result = await response.json();

            if (result.success) {
              // All files go to Files section, not to description
              console.log('File uploaded, URL:', result.data.url);
              
              // Call the callback with empty content since we don't want to modify description
              onFileUploaded(result.data.url, '');
              
              // Show success animation
              toast({
                title: "Úspech",
                description: `📁 "${result.data.fileName}" nahraný (${compressionInfo})`,
              });
            } else {
            toast({
              title: "Chyba",
              description: result.error || "Nepodarilo sa nahrať súbor",
              variant: "destructive",
            });
          }
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa nahrať súbor",
        variant: "destructive",
      });
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
      // Add drag animation to editor
      const editor = document.querySelector('.ql-editor');
      if (editor) {
        editor.classList.add('drag-over');
      }
    } else if (e.type === "dragleave") {
      setDragActive(false);
      // Remove drag animation from editor
      const editor = document.querySelector('.ql-editor');
      if (editor) {
        editor.classList.remove('drag-over');
      }
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    // Remove drag animation from editor
    const editor = document.querySelector('.ql-editor');
    if (editor) {
      editor.classList.remove('drag-over');
    }

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  }, [taskId]);

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          
          // Show paste animation
          const editor = document.querySelector('.ql-editor');
          if (editor) {
            editor.classList.add('paste-animation');
            setTimeout(() => {
              editor.classList.remove('paste-animation');
            }, 1000);
          }
          
          handleFileUpload(file);
        }
      }
    }
  }, [taskId]);


  // Add paste event listener
  useEffect(() => {
    const handlePasteEvent = (e: ClipboardEvent) => {
      handlePaste(e);
    };

    document.addEventListener('paste', handlePasteEvent);
    return () => {
      document.removeEventListener('paste', handlePasteEvent);
    };
  }, [handlePaste]);

  return (
    <div
      className="relative"
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      {children}
      
      {/* Drag overlay */}
      {dragActive && (
        <div className="absolute inset-0 bg-blue-500/20 border-2 border-dashed border-blue-500 rounded-lg flex items-center justify-center z-10 animate-pulse">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg animate-bounce">
            <Upload className="h-8 w-8 text-blue-500 mx-auto mb-2 animate-spin" />
            <p className="text-sm font-medium">Pustite súbor sem</p>
          </div>
        </div>
      )}


    </div>
  );
};
