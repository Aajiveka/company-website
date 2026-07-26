import { useRef, useState, useCallback } from 'react';

interface DragItem { id: string; columnId: string; index: number; }

interface UseDragAndDropOptions<T> {
  columns: Record<string, T[]>;
  onReorder: (itemId: string, fromColumn: string, toColumn: string, newIndex: number) => void;
}

export function useDragAndDrop<T extends { id: string }>({ onReorder }: UseDragAndDropOptions<T>) {
  const dragItem = useRef<DragItem | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const handleDragStart = useCallback((itemId: string, columnId: string, index: number) => {
    dragItem.current = { id: itemId, columnId, index };
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumn(columnId);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetColumnId: string, targetIndex: number) => {
    e.preventDefault();
    const item = dragItem.current;
    if (!item) return;
    onReorder(item.id, item.columnId, targetColumnId, targetIndex);
    dragItem.current = null;
    setDragOverColumn(null);
  }, [onReorder]);

  const handleDragEnd = useCallback(() => {
    dragItem.current = null;
    setDragOverColumn(null);
  }, []);

  return { handleDragStart, handleDragOver, handleDrop, handleDragEnd, dragOverColumn };
}
