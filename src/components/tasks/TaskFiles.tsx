"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  File, 
  Download, 
  Trash2, 
  ExternalLink, 
  Loader2,
  Upload,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  FileImage,
  X,
  ZoomIn
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { compressImageWithTinyJPG, isTinyJPGAvailable } from "@/lib/tinyjpg";
import { compressFile, shouldCompressFile, getCompressionInfo } from "@/lib/universal-compression";

interface TaskFile {
  name: string;
  url: string;
  size: number;
  type: string;
  createdAt: string;
}

interface TaskFilesProps {
  taskId: string;
}

export const TaskFiles = ({ taskId }: TaskFilesProps) => {
  const [files, setFiles] = useState<TaskFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [newFileAnimation, setNewFileAnimation] = useState<string | null>(null);

  const fetchFiles = async () => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/files`, {
        credentials: "include",
      });
      const result = await response.json();

      if (result.success) {
        setFiles(result.data || []);
      } else {
        console.error("Failed to fetch files:", result.error);
      }
    } catch (error) {
      console.error("Error fetching files:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [taskId]);

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
    setIsUploading(true);
    setUploadingFiles(prev => [...prev, file.name]);
    
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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Nepodarilo sa nahrať súbor");
      }

      // Refresh files list
      await fetchFiles();
      
      // Show animation for new file
      setNewFileAnimation(file.name);
      setTimeout(() => setNewFileAnimation(null), 2000);
      
      toast({
        title: "Súbor nahraný",
        description: `📁 ${file.name} nahraný (${compressionInfo})`,
      });
    } catch (error) {
      console.error("Upload file error:", error);
      toast({
        title: "Chyba",
        description: error instanceof Error ? error.message : "Nepodarilo sa nahrať súbor",
        variant: "destructive",
      });
    } finally {
      setUploadingFiles(prev => {
        const newList = prev.filter(name => name !== file.name);
        if (newList.length === 0) {
          setIsUploading(false);
        }
        return newList;
      });
    }
  };

  const handleDeleteFile = async (fileName: string) => {
    setIsDeleting(fileName);
    try {
      const response = await fetch(`/api/tasks/${taskId}/files/${encodeURIComponent(fileName)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const result = await response.json();

      if (result.success) {
        setFiles(files.filter(file => file.name !== fileName));
        toast({
          title: "Úspech",
          description: "Súbor bol vymazaný",
        });
      } else {
        toast({
          title: "Chyba",
          description: result.error || "Nepodarilo sa vymazať súbor",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting file:", error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa vymazať súbor",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (type: string, url?: string) => {
    if (type.startsWith("image/")) {
      return (
        <div 
          className="relative w-20 h-20 rounded-lg overflow-hidden bg-muted flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity group border border-border"
          onClick={() => setSelectedImage(url || '')}
          title="Kliknite pre zobrazenie v plnej veľkosti"
        >
          <img 
            src={url} 
            alt="Preview" 
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to icon if image fails to load
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
          <ImageIcon className="h-10 w-10 hidden text-muted-foreground" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      );
    } else if (type.includes("spreadsheet") || type.includes("excel")) {
      return (
        <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center border border-border">
          <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
        </div>
      );
    } else if (type.includes("pdf")) {
      return (
        <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center border border-border">
          <FileText className="h-10 w-10 text-muted-foreground" />
        </div>
      );
    } else {
      return (
        <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center border border-border">
          <File className="h-10 w-10 text-muted-foreground" />
        </div>
      );
    }
  };

  const getFileTypeColor = (type: string) => {
    if (type.startsWith("image/")) {
      return "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300";
    } else if (type.includes("pdf")) {
      return "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300";
    } else if (type.includes("spreadsheet") || type.includes("excel")) {
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300";
    } else {
      return "bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300";
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-card border border-border shadow-sm">
        <CardHeader className="bg-muted/50">
          <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            <File className="h-5 w-5" />
            Súbory
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Načítavam súbory...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    <Card className="bg-card border border-border shadow-sm">
      <CardHeader className="bg-muted/50">
        <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
          <File className="h-5 w-5" />
          Súbory
          {files.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {files.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent 
        className="p-6"
        onDragOver={(e) => {
          e.preventDefault();
          e.currentTarget.classList.add('bg-blue-50', 'dark:bg-blue-900/20', 'border-blue-300', 'dark:border-blue-700', 'scale-105', 'shadow-lg');
        }}
        onDragLeave={(e) => {
          e.currentTarget.classList.remove('bg-blue-50', 'dark:bg-blue-900/20', 'border-blue-300', 'dark:border-blue-700', 'scale-105', 'shadow-lg');
        }}
        onDrop={async (e) => {
          e.preventDefault();
          e.currentTarget.classList.remove('bg-blue-50', 'dark:bg-blue-900/20', 'border-blue-300', 'dark:border-blue-700', 'scale-105', 'shadow-lg');
          
          const droppedFiles = Array.from(e.dataTransfer.files);
          if (droppedFiles.length === 0) return;
          
          // Upload all files in parallel
          await Promise.all(droppedFiles.map(file => handleFileUpload(file)));
        }}
      >
        {files.length === 0 && !isUploading ? (
          <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-lg hover:border-blue-300 dark:hover:border-blue-700 transition-colors duration-300">
            <Upload className="h-12 w-12 mx-auto mb-4 opacity-50 animate-bounce" />
            <p>Žiadne súbory nie sú nahrané</p>
            <p className="text-sm mt-1">Drag & drop súbory sem alebo paste do popisu úlohy</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {/* Uploading files */}
            {uploadingFiles.map((fileName, index) => (
              <div
                key={`uploading-${index}`}
                className="aspect-square bg-muted/30 rounded-lg border border-border border-dashed relative flex flex-col items-center justify-center animate-pulse"
              >
                <div className="flex flex-col items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
                  <p className="text-xs font-medium text-foreground text-center truncate w-full mb-1">
                    {fileName}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    Nahrávam...
                  </span>
                </div>
              </div>
            ))}
            
            {/* Existing files */}
            {files.map((file, index) => (
              <div
                key={index}
                className={`aspect-square bg-muted/30 rounded-lg border border-border hover:bg-muted/50 transition-all duration-500 overflow-hidden relative group ${
                  newFileAnimation === file.name 
                    ? 'animate-pulse ring-2 ring-green-500 ring-opacity-50 scale-105 shadow-lg' 
                    : ''
                }`}
              >
                {file.type.startsWith("image/") ? (
                  <>
                    {/* Full-size image thumbnail */}
                    <div 
                      className="w-full h-full cursor-pointer relative"
                      onClick={() => setSelectedImage(file.url)}
                      title="Kliknite pre zobrazenie v plnej veľkosti"
                    >
                      <img 
                        src={file.url} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to icon if image fails to load
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      <div className="absolute inset-0 bg-muted flex items-center justify-center hidden">
                        <ImageIcon className="h-12 w-12 text-muted-foreground" />
                      </div>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    
                    {/* File info overlay at bottom */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2">
                      <p className="text-xs font-medium truncate">
                        {file.name}
                      </p>
                      <span className="text-xs text-gray-300">
                        {formatFileSize(file.size)}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Non-image files */}
                    <div className="w-full h-full flex flex-col items-center justify-center p-3">
                      <div className="mb-2">
                        {getFileIcon(file.type, file.url)}
                      </div>
                      
                      {/* File Name */}
                      <p className="text-xs font-medium text-foreground text-center truncate w-full mb-1">
                        {file.name}
                      </p>
                      
                      {/* File Size */}
                      <span className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </span>
                    </div>
                  </>
                )}
                
                {/* Action Buttons - Hidden by default, shown on hover */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(file.url, '_blank')}
                    className="h-6 w-6 p-0 bg-black/50 hover:bg-black/70 text-white"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteFile(file.name)}
                    disabled={isDeleting === file.name}
                    className="h-6 w-6 p-0 bg-black/50 hover:bg-black/70 text-white"
                  >
                    {isDeleting === file.name ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>

    {/* Image Modal - Simple approach */}
    {selectedImage && (
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px'
        }}
        onClick={() => setSelectedImage(null)}
      >
        <div 
          style={{
            position: 'relative',
            maxWidth: '90vw',
            maxHeight: '90vh',
            backgroundColor: 'white',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              zIndex: 10,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '8px',
              cursor: 'pointer'
            }}
            onClick={() => setSelectedImage(null)}
          >
            <X className="h-4 w-4" />
          </button>
          <img 
            src={selectedImage} 
            alt="Full size preview" 
            style={{
              maxWidth: '100%',
              maxHeight: '80vh',
              objectFit: 'contain',
              display: 'block'
            }}
            onLoad={() => console.log('Image loaded successfully')}
            onError={(e) => {
              console.log('Image failed to load:', e);
              console.log('Image src:', selectedImage);
            }}
          />
        </div>
      </div>
    )}
  </>
  );
};
