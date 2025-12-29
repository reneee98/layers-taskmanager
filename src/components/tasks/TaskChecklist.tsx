"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Plus, 
  MoreHorizontal, 
  Edit3, 
  Trash2, 
  Check,
  GripVertical
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TaskChecklistItem } from "@/types/database";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TaskChecklistProps {
  taskId: string;
}

interface SortableItemProps {
  item: TaskChecklistItem;
  onToggle: (itemId: string, completed: boolean) => void;
  onEdit: (item: TaskChecklistItem) => void;
  onDelete: (itemId: string) => void;
  editingItem: string | null;
  editText: string;
  setEditText: (text: string) => void;
  onEditSubmit: (itemId: string) => void;
  onEditCancel: () => void;
}

const SortableItem = ({ 
  item, 
  onToggle, 
  onEdit, 
  onDelete, 
  editingItem, 
  editText, 
  setEditText, 
  onEditSubmit, 
  onEditCancel 
}: SortableItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex gap-4 h-[49px] items-center px-6 py-0 border-b border-[#f1f5f9] dark:border-border transition-all duration-200 ${
        isDragging ? 'opacity-50 shadow-lg' : ''
      }`}
    >
      <Checkbox
        checked={item.completed}
        onCheckedChange={(checked) => 
          onToggle(item.id, checked as boolean)
        }
        className={cn(
          "flex-shrink-0 size-5 rounded-[4px] border-2",
          item.completed 
            ? 'bg-[#155dfc] border-[#155dfc] data-[state=checked]:bg-[#155dfc] data-[state=checked]:border-[#155dfc]' 
            : 'bg-white dark:bg-card border-[#cad5e2] dark:border-border'
        )}
      />
      
      {editingItem === item.id ? (
        <div className="flex-1 flex gap-1">
          <Input
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="flex-1 h-7 text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onEditSubmit(item.id);
              } else if (e.key === 'Escape') {
                onEditCancel();
              }
            }}
            autoFocus
          />
          <Button 
            size="sm" 
            onClick={() => onEditSubmit(item.id)}
            disabled={!editText.trim()}
            className="h-7 px-2"
          >
            <Check className="h-3 w-3" />
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={onEditCancel}
            className="h-7 px-2 text-xs"
          >
            Zrušiť
          </Button>
        </div>
      ) : (
        <>
          <span 
            className={`flex-1 h-5 text-[14px] font-medium transition-all duration-200 ${
              item.completed 
                ? 'line-through text-[#90a1b9] dark:text-muted-foreground' 
                : 'text-[#314158] dark:text-foreground'
            } tracking-[-0.1504px]`}
          >
            {item.text}
          </span>
          
          <div className="flex items-center gap-2 opacity-60">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-5 w-5 p-0 hover:bg-accent">
                  <span className="sr-only">Otvoriť menu</span>
                  <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(item)}>
                  <Edit3 className="mr-2 h-3 w-3" /> Upraviť
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDelete(item.id)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="mr-2 h-3 w-3" /> Vymazať
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </>
      )}
    </div>
  );
};

export const TaskChecklist = ({ taskId }: TaskChecklistProps) => {
  const [items, setItems] = useState<TaskChecklistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newItemText, setNewItemText] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch checklist items
  const fetchItems = async () => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/checklist`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch checklist items');
      }
      
      const result = await response.json();
      setItems(result.data || []);
    } catch (error) {
      console.error('Error fetching checklist items:', error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa načítať checklist položky",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [taskId]);

  // Add new item
  const handleAddItem = async () => {
    if (!newItemText.trim()) return;

    setIsAdding(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/checklist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          text: newItemText.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checklist item');
      }

      const result = await response.json();
      setItems(prev => [...prev, result.data]);
      setNewItemText("");
      toast({
        title: "Úspech",
        description: "Položka bola pridaná do checklistu"
      });
    } catch (error) {
      console.error('Error adding checklist item:', error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa pridať položku",
        variant: "destructive"
      });
    } finally {
      setIsAdding(false);
    }
  };

  // Toggle item completion
  const handleToggleItem = async (itemId: string, completed: boolean) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/checklist/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ completed }),
      });

      if (!response.ok) {
        throw new Error('Failed to update checklist item');
      }

      setItems(prev => 
        prev.map(item => 
          item.id === itemId ? { ...item, completed } : item
        )
      );
    } catch (error) {
      console.error('Error toggling checklist item:', error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa aktualizovať položku",
        variant: "destructive"
      });
    }
  };

  // Edit item
  const handleEditItem = async (itemId: string) => {
    if (!editText.trim()) return;

    try {
      const response = await fetch(`/api/tasks/${taskId}/checklist/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ text: editText.trim() }),
      });

      if (!response.ok) {
        throw new Error('Failed to update checklist item');
      }

      setItems(prev => 
        prev.map(item => 
          item.id === itemId ? { ...item, text: editText.trim() } : item
        )
      );
      setEditingItem(null);
      setEditText("");
      toast({
        title: "Úspech",
        description: "Položka bola aktualizovaná"
      });
    } catch (error) {
      console.error('Error editing checklist item:', error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa aktualizovať položku",
        variant: "destructive"
      });
    }
  };

  // Delete item
  const handleDeleteItem = async (itemId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/checklist/${itemId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to delete checklist item');
      }

      setItems(prev => prev.filter(item => item.id !== itemId));
      toast({
        title: "Úspech",
        description: "Položka bola vymazaná"
      });
    } catch (error) {
      console.error('Error deleting checklist item:', error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa vymazať položku",
        variant: "destructive"
      });
    }
  };

  // Start editing
  const startEditing = (item: TaskChecklistItem) => {
    setEditingItem(item.id);
    setEditText(item.text);
  };

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex(item => item.id === active.id);
      const newIndex = items.findIndex(item => item.id === over.id);

      const newItems = arrayMove(items, oldIndex, newIndex);
      setItems(newItems);

      // Update positions in database
      try {
        for (let i = 0; i < newItems.length; i++) {
          const item = newItems[i];
          await fetch(`/api/tasks/${taskId}/checklist/${item.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ position: i }),
          });
        }
      } catch (error) {
        console.error('Error updating positions:', error);
        toast({
          title: "Chyba",
          description: "Nepodarilo sa aktualizovať poradie položiek",
          variant: "destructive"
        });
        // Revert on error
        fetchItems();
      }
    }
  };

  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (isLoading) {
    return (
      <Card className="bg-card border border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <Check className="h-4 w-4" />
            Checklist
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-card border border-[#e2e8f0] dark:border-border rounded-[14px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
      <CardHeader className="h-[69px] pb-0 pt-4 px-6 border-b border-[#f1f5f9] dark:border-border rounded-tl-[14px] rounded-tr-[14px]">
        <div className="flex items-center justify-between h-[22px]">
          <div className="flex items-center gap-6">
            <Check className="h-4 w-4 text-[#0f172b] dark:text-foreground" />
            <CardTitle className="text-[14px] font-bold text-[#0f172b] dark:text-foreground tracking-[-0.1504px] m-0">
              Checklist
            </CardTitle>
          </div>
          {totalCount > 0 && (
            <div className="box-content bg-[#f1f5f9] dark:bg-muted border border-[#e2e8f0] dark:border-border h-[22px] rounded-[8px] px-[9px] py-[3px]">
              <span className="text-[12px] font-medium text-[#45556c] dark:text-foreground">
                {progressPercentage}% hotovo
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-0 pb-0">
        {/* Checklist items */}
        {items.length === 0 ? (
          <div className="text-center py-8 px-6 text-muted-foreground">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted/50 flex items-center justify-center">
              <Check className="h-6 w-6 opacity-50" />
            </div>
            <h3 className="font-medium text-foreground mb-1 text-sm">Žiadne položky v checkliste</h3>
            <div className="flex gap-2 justify-center mt-4">
              <Input
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                placeholder="Pridať novú položku..."
                className="flex-1 max-w-xs h-8 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddItem();
                  }
                }}
              />
              <Button 
                onClick={handleAddItem}
                disabled={!newItemText.trim() || isAdding}
                size="sm"
                className="h-8 px-3 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Pridať
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={items.map(item => item.id)} strategy={verticalListSortingStrategy}>
                <div>
                  {items.map((item, index) => (
                    <SortableItem
                      key={item.id}
                      item={item}
                      onToggle={handleToggleItem}
                      onEdit={startEditing}
                      onDelete={handleDeleteItem}
                      editingItem={editingItem}
                      editText={editText}
                      setEditText={setEditText}
                      onEditSubmit={handleEditItem}
                      onEditCancel={() => {
                        setEditingItem(null);
                        setEditText("");
                      }}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            {/* Add new item at bottom */}
            <div className="flex gap-2 px-6 py-3 border-t border-[#f1f5f9] dark:border-border">
              <Input
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                placeholder="Pridať novú položku..."
                className="flex-1 h-8 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddItem();
                  }
                }}
              />
              <Button 
                onClick={handleAddItem}
                disabled={!newItemText.trim() || isAdding}
                size="sm"
                className="h-8 px-3 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Pridať
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
