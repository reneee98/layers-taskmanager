"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trash2, Send } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import type { Comment } from "@/types/comments";

interface CommentsListProps {
  taskId: string;
  onCommentAdded?: () => void;
}

export function CommentsList({ taskId, onCommentAdded }: CommentsListProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/comments`);
      const result = await response.json();

      if (result.success) {
        setComments(result.data);
      } else {
        toast({
          title: "Chyba",
          description: "Nepodarilo sa načítať komentáre",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa načítať komentáre",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [taskId]);

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    console.log("Submitting comment:", { taskId, content: newComment.trim() });
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: newComment.trim(),
        }),
      });

      console.log("Response status:", response.status);
      const result = await response.json();
      console.log("Response result:", result);

      if (result.success) {
        setComments(prev => [...prev, result.data]);
        setNewComment("");
        onCommentAdded?.();
        toast({
          title: "Úspech",
          description: "Komentár bol pridaný",
        });
      } else {
        console.error("Failed to create comment:", result.error);
        toast({
          title: "Chyba",
          description: `Nepodarilo sa pridať komentár: ${result.error}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error submitting comment:", error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa pridať komentár",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        setComments(prev => prev.filter(comment => comment.id !== commentId));
        toast({
          title: "Úspech",
          description: "Komentár bol odstránený",
        });
      } else {
        toast({
          title: "Chyba",
          description: "Nepodarilo sa odstrániť komentár",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa odstrániť komentár",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-muted-foreground">Načítavam komentáre...</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Comments list */}
      <div className="space-y-3 max-h-[350px] overflow-y-auto">
        {comments.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            Zatiaľ nie sú žiadne komentáre
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-2 p-3 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <Avatar className="h-7 w-7 flex-shrink-0">
                <AvatarFallback className="text-xs">
                  {(comment.user.name || comment.user.email || "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="font-medium text-xs truncate">{comment.user.name || comment.user.email || "User"}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(comment.created_at), "d.M. HH:mm", { locale: sk })}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteComment(comment.id)}
                    className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive flex-shrink-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <div 
                  className="text-xs prose prose-xs max-w-none dark:prose-invert break-words"
                  dangerouslySetInnerHTML={{ __html: comment.content }}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add new comment */}
      <div className="space-y-2 pt-3 border-t">
        <Textarea
          placeholder="Napíšte komentár..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="min-h-[60px] resize-none text-sm"
        />
        <div className="flex justify-end">
          <Button
            onClick={handleSubmitComment}
            disabled={!newComment.trim() || isSubmitting}
            size="sm"
            className="h-8 text-xs"
          >
            <Send className="h-3 w-3 mr-1" />
            {isSubmitting ? "Pridávam..." : "Pridať"}
          </Button>
        </div>
      </div>
    </div>
  );
}
