"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileUploadHandlerProps {
  taskId: string;
  onFileUploaded: (fileUrl: string, fileName: string) => void;
  children: React.ReactNode;
}

export const FileUploadHandler = ({ taskId, onFileUploaded, children }: FileUploadHandlerProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/tasks/${taskId}/files`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const result = await response.json();

      if (result.success) {
        onFileUploaded(result.data.url, result.data.fileName);
        toast({
          title: "Úspech",
          description: `Súbor "${result.data.fileName}" bol nahraný`,
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
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

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
          handleFileUpload(file);
        }
      }
    }
  }, [taskId]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

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
        <div className="absolute inset-0 bg-blue-500/20 border-2 border-dashed border-blue-500 rounded-lg flex items-center justify-center z-10">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg">
            <Upload className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <p className="text-sm font-medium">Pustite súbor sem</p>
          </div>
        </div>
      )}

      {/* Upload button */}
      <div className="absolute top-2 right-2 z-20">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={openFileDialog}
          disabled={isUploading}
          className="bg-white/90 hover:bg-white dark:bg-gray-800/90 dark:hover:bg-gray-800"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileInput}
        accept="image/*,application/pdf,text/plain,.doc,.docx,.xls,.xlsx"
      />
    </div>
  );
};
