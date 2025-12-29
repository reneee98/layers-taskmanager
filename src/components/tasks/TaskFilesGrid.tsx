"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  File,
  MoreHorizontal,
  Trash2,
  Download,
  ExternalLink,
  Upload,
  Loader2,
  FileText,
  Image as ImageIcon,
  Archive,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from "date-fns";
import { sk } from "date-fns/locale";
import { compressFile, shouldCompressFile, getCompressionInfo } from "@/lib/universal-compression";
import { compressImageWithTinyJPG, isTinyJPGAvailable } from "@/lib/tinyjpg";

interface TaskFile {
  name: string;
  url: string;
  size: number;
  type: string;
  createdAt: string;
}

interface TaskFilesGridProps {
  taskId: string;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
  return `${value} ${sizes[i]}`;
};

const formatFileDate = (dateString: string | null | undefined): string => {
  if (!dateString) {
    return "—";
  }
  
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return "—";
    }
    
    if (isToday(date)) {
      return `Dnes, ${format(date, "HH:mm", { locale: sk })}`;
    } else if (isYesterday(date)) {
      return `Včera, ${format(date, "HH:mm", { locale: sk })}`;
    } else {
      return format(date, "d. MMM", { locale: sk });
    }
  } catch (error) {
    return "—";
  }
};

const getFileTypeIcon = (type: string, fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  if (type.startsWith("image/") || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) {
    return ImageIcon;
  } else if (type.includes("pdf") || extension === 'pdf') {
    return FileText;
  } else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension || '')) {
    return Archive;
  }
  return File;
};

const getFileTypeColor = (type: string, fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  // ZIP/Archive files - Orange
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension || '')) {
    return {
      bg: "bg-[#fffbeb]",
      icon: Archive,
    };
  }
  
  // Image files - Purple
  if (type.startsWith("image/") || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) {
    return {
      bg: "bg-[#faf5ff]",
      icon: ImageIcon,
    };
  }
  
  // PDF/DOC files - Blue
  if (type.includes("pdf") || extension === 'pdf' || type.includes("document") || ['doc', 'docx'].includes(extension || '')) {
    return {
      bg: "bg-[#eff6ff]",
      icon: FileText,
    };
  }
  
  // Default - Blue
  return {
    bg: "bg-[#eff6ff]",
    icon: File,
  };
};

export function TaskFilesGrid({ taskId }: TaskFilesGridProps) {
  const [files, setFiles] = useState<TaskFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = useCallback(async () => {
    if (!taskId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/tasks/${taskId}/files`, {
        credentials: "include",
      });
      
      const result = await response.json();

      if (result.success) {
        const filesData = result.data || [];
        
        // Normalize file data to ensure consistent format
        const normalizedFiles = filesData
          .filter((file: any) => {
            // Keep files that have at least a name or url
            const hasName = file && (file.name || file.filename);
            const hasUrl = file && (file.url || file.publicUrl || file.signedUrl);
            return hasName || hasUrl;
          })
          .map((file: any) => ({
            name: file.name || file.filename || 'Unknown',
            url: file.url || file.publicUrl || file.signedUrl || '',
            size: file.size || file.metadata?.size || 0,
            type: file.type || file.mimetype || file.metadata?.mimetype || "application/octet-stream",
            createdAt: file.createdAt || file.created_at || file.metadata?.created_at || new Date().toISOString(),
          }))
          .filter((file: any) => file.name && file.url);
        
        setFiles(normalizedFiles);
      } else {
        if (result.error) {
          toast({
            title: "Chyba",
            description: result.error || "Nepodarilo sa načítať súbory",
            variant: "destructive",
          });
        }
        setFiles([]);
      }
    } catch (error) {
      toast({
        title: "Chyba",
        description: error instanceof Error ? error.message : "Nepodarilo sa načítať súbory",
        variant: "destructive",
      });
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (taskId) {
      fetchFiles();
    } else {
      setIsLoading(false);
    }
  }, [taskId, fetchFiles]);

  // Listen for file upload events
  useEffect(() => {
    const handleFileUploaded = (e: CustomEvent) => {
      if (e.detail.taskId === taskId) {
        fetchFiles();
      }
    };

    window.addEventListener('taskFileUploaded', handleFileUploaded as EventListener);
    
    return () => {
      window.removeEventListener('taskFileUploaded', handleFileUploaded as EventListener);
    };
  }, [taskId, fetchFiles]);

  const compressFileUniversal = async (file: File): Promise<{ compressedFile: File; compressionInfo: string }> => {
    if (!shouldCompressFile(file)) {
      return {
        compressedFile: file,
        compressionInfo: 'Súbor je príliš malý alebo už komprimovaný'
      };
    }

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
        // TinyJPG compression failed, using universal compression
      }
    }

    try {
      const result = await compressFile(file);
      return {
        compressedFile: result.compressedFile,
        compressionInfo: getCompressionInfo(result)
      };
    } catch (error) {
      return {
        compressedFile: file,
        compressionInfo: 'Kompresia zlyhala'
      };
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadingFiles(prev => [...prev, file.name]);
    
    try {
      const { compressedFile } = await compressFileUniversal(file);

      const formData = new FormData();
      formData.append("file", compressedFile);

      const response = await fetch(`/api/tasks/${taskId}/files`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Nepodarilo sa nahrať súbor");
      }

      await fetchFiles();
      
      toast({
        title: "Úspech",
        description: `Súbor "${file.name}" bol úspešne nahraný`,
      });
    } catch (error) {
      toast({
        title: "Chyba",
        description: error instanceof Error ? error.message : "Nepodarilo sa nahrať súbor",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadingFiles(prev => prev.filter(name => name !== file.name));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;
    
    selectedFiles.forEach(file => handleFileUpload(file));
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteFile = async (fileName: string) => {
    if (!confirm(`Naozaj chcete vymazať súbor "${fileName}"?`)) return;

    setIsDeleting(fileName);
    try {
      const response = await fetch(`/api/tasks/${taskId}/files/${encodeURIComponent(fileName)}`, {
        method: "DELETE",
        credentials: "include",
      });

      const result = await response.json();

      if (result.success) {
        toast({ title: "Úspech", description: "Súbor bol vymazaný" });
        await fetchFiles();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Chyba",
        description: error instanceof Error ? error.message : "Nepodarilo sa vymazať súbor",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleDownload = (file: TaskFile) => {
    window.open(file.url, '_blank');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Filter valid files
  const validFiles = files.filter((file) => {
    return file && file.name && file.url;
  });

  return (
    <div className="space-y-4">
      {/* Files Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Existing Files */}
        {validFiles.length > 0 ? validFiles.map((file, index) => {
          const fileTypeColor = getFileTypeColor(file.type, file.name);
          const FileIcon = fileTypeColor.icon;
          const SmallFileIcon = getFileTypeIcon(file.type, file.name);

          return (
            <Card
              key={`${file.name}-${index}`}
              className="bg-white dark:bg-card border border-[#e2e8f0] dark:border-border rounded-[14px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] overflow-hidden hover:shadow-md transition-shadow group"
            >
              {/* Large Icon Box - Figma 1:1 */}
              <div className={`${fileTypeColor.bg} border-b border-[#f1f5f9] dark:border-border h-[128px] flex items-center justify-center relative overflow-hidden`}>
                <div className={`${fileTypeColor.bg} rounded-[14px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] w-12 h-12 flex items-center justify-center`}>
                  <FileIcon className="h-6 w-6 text-[#0f172b] dark:text-foreground" />
                </div>
              </div>

              {/* File Info - Figma 1:1 */}
              <div className="pt-4 pb-4 px-4 flex flex-col gap-2">
                {/* Header Row - Small Icon and Menu */}
                <div className="flex items-start justify-between h-5">
                  <div className="bg-[#f1f5f9] dark:bg-muted rounded-[4px] w-5 h-5 flex items-center justify-center">
                    <SmallFileIcon className="h-3 w-3 text-[#314158] dark:text-foreground" />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-[14px] w-[14px] p-0 hover:bg-muted"
                      >
                        <MoreHorizontal className="h-[14px] w-[14px] text-[#90a1b9] dark:text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleDownload(file)}>
                        <Download className="h-4 w-4 mr-2" />
                        Stiahnuť
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => window.open(file.url, '_blank')}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Otvoriť v novom okne
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteFile(file.name)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Vymazať
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* File Name - Figma 1:1 */}
                <h3 className="font-bold text-sm leading-5 text-[#314158] dark:text-foreground tracking-[-0.1504px] line-clamp-2 min-h-[20px]">
                  {file.name}
                </h3>

                {/* File Size and Date - Figma 1:1 */}
                <div className="flex items-center justify-between h-[16.5px]">
                  <span className="text-[11px] leading-[16.5px] text-[#90a1b9] dark:text-muted-foreground tracking-[0.0645px]">
                    {formatFileSize(file.size)}
                  </span>
                  <span className="text-[11px] leading-[16.5px] text-[#90a1b9] dark:text-muted-foreground tracking-[0.0645px]">
                    {formatFileDate(file.createdAt)}
                  </span>
                </div>
              </div>
            </Card>
          );
        }) : (
          // Show message if we have files but none are valid
          files.length > 0 && (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              <p className="text-sm">Načítané súbory, ale nie sú správne naformátované.</p>
              <p className="text-xs mt-2">Skontrolujte konzolu prehliadača pre viac informácií.</p>
            </div>
          )
        )}

        {/* Upload Card - Figma 1:1 */}
        <Card
          className="bg-white dark:bg-card border-2 border-dashed border-[#e2e8f0] dark:border-border rounded-[14px] hover:border-[#cbd5e1] dark:hover:border-border/70 transition-colors cursor-pointer group"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            e.currentTarget.classList.add('border-[#155dfc]', 'bg-[#eff6ff]/10');
          }}
          onDragLeave={(e) => {
            e.currentTarget.classList.remove('border-[#155dfc]', 'bg-[#eff6ff]/10');
          }}
          onDrop={async (e) => {
            e.preventDefault();
            e.currentTarget.classList.remove('border-[#155dfc]', 'bg-[#eff6ff]/10');
            
            const droppedFiles = Array.from(e.dataTransfer.files);
            if (droppedFiles.length === 0) return;
            
            await Promise.all(droppedFiles.map(file => handleFileUpload(file)));
          }}
        >
          <div className="h-[200px] flex flex-col items-center justify-center gap-2 p-[2px]">
            {isUploading ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Nahrávam...</span>
              </>
            ) : (
              <>
                <Upload className="h-6 w-6 text-[#90a1b9] dark:text-muted-foreground group-hover:text-[#64748b] dark:group-hover:text-foreground transition-colors" />
                <span className="font-medium text-xs leading-4 text-[#90a1b9] dark:text-muted-foreground group-hover:text-[#64748b] dark:group-hover:text-foreground transition-colors">
                  Nahrať súbor
                </span>
              </>
            )}
          </div>
        </Card>

        {/* Uploading Files */}
        {uploadingFiles.map((fileName, index) => (
          <Card
            key={`uploading-${index}`}
            className="bg-white dark:bg-card border border-[#e2e8f0] dark:border-border rounded-[14px] overflow-hidden opacity-60"
          >
            <div className="h-[128px] bg-muted/30 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between h-5 mb-2">
                <div className="bg-[#f1f5f9] dark:bg-muted rounded-[4px] w-5 h-5" />
                <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground opacity-50" />
              </div>
              <h3 className="font-bold text-sm text-[#314158] dark:text-foreground line-clamp-2 min-h-[40px] mb-2">
                {fileName}
              </h3>
              <div className="flex items-center justify-between h-4">
                <span className="text-[11px] text-muted-foreground">Nahrávam...</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}

