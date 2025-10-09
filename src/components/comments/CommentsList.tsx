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
    <div className="space-y-4">
      {/* Add new comment */}
      <div className="space-y-2">
        <Textarea
          placeholder="Napíšte komentár..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="min-h-[80px]"
        />
        <div className="flex justify-end">
          <Button
            onClick={handleSubmitComment}
            disabled={!newComment.trim() || isSubmitting}
            size="sm"
          >
            <Send className="h-4 w-4 mr-2" />
            {isSubmitting ? "Pridávam..." : "Pridať komentár"}
          </Button>
        </div>
      </div>

      {/* Comments list */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Zatiaľ nie sú žiadne komentáre
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 p-3 border rounded-lg">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {(comment.user.name || comment.user.email || "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{comment.user.name || comment.user.email || "User"}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(comment.created_at), "d. M. yyyy 'o' HH:mm", { locale: sk })}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteComment(comment.id)}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
