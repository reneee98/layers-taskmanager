"use client";

import { useState, useEffect, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { sk } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { QuillEditor } from "@/components/ui/quill-editor";
import { 
  MoreHorizontal, 
  Reply, 
  Edit, 
  Trash2, 
  MessageSquare 
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import type { TaskComment } from "@/types/comments";

interface CommentsListProps {
  taskId: string;
  onCommentAdded?: () => void;
  onCommentUpdated?: () => void;
  onCommentDeleted?: () => void;
}

export function CommentsList({ 
  taskId, 
  onCommentAdded, 
  onCommentUpdated, 
  onCommentDeleted 
}: CommentsListProps) {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [newCommentHtml, setNewCommentHtml] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchComments();
  }, [taskId]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/comments`);
      if (!response.ok) throw new Error("Failed to fetch comments");
      
      const data = await response.json();
      setComments(data.data || []);
    } catch (error) {
      console.error("Error fetching comments:", error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa načítať komentáre.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCommentChange = (content: string, html: string) => {
    setNewComment(content);
    setNewCommentHtml(html);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Uložiť komentár pri stlačení Ctrl+Enter alebo Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleAddComment();
    }
  };

  // Odstránené automatické ukladanie pri odkliknutí

  const handleAddComment = async () => {
    if (!newComment.trim() || isSaving) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newComment,
          content_html: newCommentHtml,
          parent_id: replyingTo,
        }),
      });

      if (!response.ok) throw new Error("Failed to add comment");

      setNewComment("");
      setNewCommentHtml("");
      setReplyingTo(null);
      fetchComments();
      onCommentAdded?.();
      
      toast({
        title: "Komentár pridaný",
        description: "Komentár bol úspešne pridaný.",
      });
    } catch (error) {
      console.error("Error adding comment:", error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa pridať komentár.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateComment = async (commentId: string, content: string, contentHtml: string) => {
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          content_html: contentHtml,
        }),
      });

      if (!response.ok) throw new Error("Failed to update comment");

      setEditingComment(null);
      fetchComments();
      onCommentUpdated?.();
      
      toast({
        title: "Komentár aktualizovaný",
        description: "Komentár bol úspešne aktualizovaný.",
      });
    } catch (error) {
      console.error("Error updating comment:", error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa aktualizovať komentár.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Naozaj chcete vymazať tento komentár?")) return;

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete comment");

      fetchComments();
      onCommentDeleted?.();
      
      toast({
        title: "Komentár vymazaný",
        description: "Komentár bol úspešne vymazaný.",
      });
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa vymazať komentár.",
        variant: "destructive",
      });
    }
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
      {/* Add new comment */}
      <div className="space-y-3">
        <QuillEditor
          content={newComment}
          onChange={handleCommentChange}
          onKeyDown={handleKeyDown}
          placeholder={replyingTo ? "Napíšte odpoveď..." : "Napíšte komentár..."}
          taskId={taskId}
        />
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            {isSaving && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                Ukladám...
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              Ctrl+Enter pre odoslanie
            </div>
          </div>
          <div className="flex gap-2">
            {replyingTo && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReplyingTo(null)}
              >
                Zrušiť
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleAddComment}
              disabled={!newComment.trim() || isSaving}
            >
              {replyingTo ? "Odpovedať" : "Pridať komentár"}
            </Button>
          </div>
        </div>
      </div>

      {/* Comments list */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Žiadne komentáre</p>
            <p className="text-sm">Buďte prvý, kto napíše komentár!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onReply={(parentId) => setReplyingTo(parentId)}
              onEdit={(commentId) => setEditingComment(commentId)}
              onUpdate={handleUpdateComment}
              onDelete={handleDeleteComment}
              isEditing={editingComment === comment.id}
              onCancelEdit={() => setEditingComment(null)}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface CommentItemProps {
  comment: TaskComment;
  onReply: (parentId: string) => void;
  onEdit: (commentId: string) => void;
  onUpdate: (commentId: string, content: string, contentHtml: string) => void;
  onDelete: (commentId: string) => void;
  isEditing: boolean;
  onCancelEdit: () => void;
}

function CommentItem({ 
  comment, 
  onReply, 
  onEdit, 
  onUpdate, 
  onDelete, 
  isEditing, 
  onCancelEdit 
}: CommentItemProps) {
  const [editContent, setEditContent] = useState(comment.content);
  const [editContentHtml, setEditContentHtml] = useState(comment.content_html || "");

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSaveEdit = () => {
    onUpdate(comment.id, editContent, editContentHtml);
  };

  return (
    <div className="flex gap-3">
      <Avatar className="h-8 w-8">
        <AvatarFallback className="text-xs">
          {getInitials(comment.user?.name || comment.user?.email || "U")}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">
            {comment.user?.name || comment.user?.email}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(comment.created_at), { 
              addSuffix: true, 
              locale: sk 
            })}
          </span>
          {comment.is_edited && (
            <Badge variant="secondary" className="text-xs">
              Upravené
            </Badge>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <QuillEditor
              content={editContent}
              onChange={(content, html) => {
                setEditContent(content);
                setEditContentHtml(html);
              }}
              placeholder="Upravte komentár..."
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onCancelEdit}
              >
                Zrušiť
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEdit}
                disabled={!editContent.trim()}
              >
                Uložiť
              </Button>
            </div>
          </div>
        ) : (
          <div 
            className="prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ 
              __html: comment.content_html || comment.content 
            }}
          />
        )}

        {!isEditing && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReply(comment.id)}
              className="h-8 px-2"
            >
              <Reply className="h-3 w-3 mr-1" />
              Odpovedať
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(comment.id)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Upraviť
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDelete(comment.id)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Vymazať
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="ml-4 space-y-3 border-l-2 border-muted pl-4">
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                onReply={onReply}
                onEdit={onEdit}
                onUpdate={onUpdate}
                onDelete={onDelete}
                isEditing={false}
                onCancelEdit={onCancelEdit}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
