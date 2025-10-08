"use client";

import { useState, useEffect, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { sk } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Upload, 
  File, 
  Image, 
  FileText, 
  Archive, 
  Video, 
  Music,
  Download,
  Trash2,
  MoreHorizontal,
  Paperclip
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import type { TaskFile } from "@/types/files";

interface FilesListProps {
  taskId: string;
  onFileAdded?: () => void;
  onFileDeleted?: () => void;
}

export function FilesList({ taskId, onFileAdded, onFileDeleted }: FilesListProps) {
  const [files, setFiles] = useState<TaskFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDescription, setFileDescription] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchFiles();
  }, [taskId]);

  const fetchFiles = async () => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/files`);
      if (!response.ok) throw new Error("Failed to fetch files");
      
      const data = await response.json();
      setFiles(data.data || []);
    } catch (error) {
      console.error("Error fetching files:", error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa načítať súbory.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setShowUpload(true);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("task_id", taskId);
      if (fileDescription.trim()) {
        formData.append("description", fileDescription.trim());
      }

      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to upload file");

      setSelectedFile(null);
      setFileDescription("");
      setShowUpload(false);
      fetchFiles();
      onFileAdded?.();
      
      toast({
        title: "Súbor nahraný",
        description: "Súbor bol úspešne nahraný.",
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa nahrať súbor.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm("Naozaj chcete vymazať tento súbor?")) return;

    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete file");

      fetchFiles();
      onFileDeleted?.();
      
      toast({
        title: "Súbor vymazaný",
        description: "Súbor bol úspešne vymazaný.",
      });
    } catch (error) {
      console.error("Error deleting file:", error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa vymazať súbor.",
        variant: "destructive",
      });
    }
  };

  const getFileIcon = (mimeType: string, extension: string) => {
    if (mimeType.startsWith("image/")) return <Image className="h-4 w-4" />;
    if (mimeType.startsWith("video/")) return <Video className="h-4 w-4" />;
    if (mimeType.startsWith("audio/")) return <Music className="h-4 w-4" />;
    if (mimeType.includes("pdf") || extension === "pdf") return <FileText className="h-4 w-4" />;
    if (mimeType.includes("zip") || mimeType.includes("rar") || extension === "zip" || extension === "rar") {
      return <Archive className="h-4 w-4" />;
    }
    return <File className="h-4 w-4" />;
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upload section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Nahrať súbor
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept="*/*"
          />
        </div>

        {showUpload && selectedFile && (
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              {getFileIcon(selectedFile.type, selectedFile.name.split('.').pop() || '')}
              <span className="font-medium">{selectedFile.name}</span>
              <Badge variant="secondary">
                {formatFileSize(selectedFile.size)}
              </Badge>
            </div>
            
            <Textarea
              placeholder="Popis súboru (voliteľné)..."
              value={fileDescription}
              onChange={(e) => setFileDescription(e.target.value)}
              rows={2}
            />
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedFile(null);
                  setFileDescription("");
                  setShowUpload(false);
                }}
              >
                Zrušiť
              </Button>
              <Button
                size="sm"
                onClick={handleUpload}
                disabled={uploading}
              >
                {uploading ? "Nahrávam..." : "Nahrať"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Files list */}
      <div className="space-y-2">
        {files.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Paperclip className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Žiadne súbory</p>
            <p className="text-sm">Nahrajte prvý súbor!</p>
          </div>
        ) : (
          files.map((file) => (
            <FileItem
              key={file.id}
              file={file}
              onDelete={handleDeleteFile}
              getFileIcon={getFileIcon}
              getInitials={getInitials}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface FileItemProps {
  file: TaskFile;
  onDelete: (fileId: string) => void;
  getFileIcon: (mimeType: string, extension: string) => React.ReactNode;
  getInitials: (name: string) => string;
}

function FileItem({ file, onDelete, getFileIcon, getInitials }: FileItemProps) {
  return (
    <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex-shrink-0">
        {getFileIcon(file.mime_type, file.file_extension || '')}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">
            {file.original_filename}
          </span>
          <Badge variant="secondary" className="text-xs">
            {file.formatted_size}
          </Badge>
        </div>
        
        {file.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {file.description}
          </p>
        )}
        
        <div className="flex items-center gap-2 mt-1">
          <Avatar className="h-5 w-5">
            <AvatarFallback className="text-xs">
              {getInitials(file.user?.name || file.user?.email || "U")}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground">
            {file.user?.name || file.user?.email}
          </span>
          <span className="text-xs text-muted-foreground">
            •
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(file.created_at), { 
              addSuffix: true, 
              locale: sk 
            })}
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Stiahnuť súbor"
        >
          <Download className="h-4 w-4" />
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem 
              onClick={() => onDelete(file.id)}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Vymazať
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
