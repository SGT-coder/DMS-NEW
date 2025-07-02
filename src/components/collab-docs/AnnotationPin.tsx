import type { Comment, User } from '@/app/types';
import { MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import React from 'react';

interface AnnotationPinProps {
  comment: Omit<Comment, 'replies' | 'text' | 'timestamp'> & { id: string, x: number, y: number };
  user?: User;
  isNew?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
}

export function AnnotationPin({ comment, user, isNew = false, isSelected = false, onClick, onDragStart }: AnnotationPinProps) {
  if (!user) return null;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    onClick?.();
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    onDragStart?.(e);
  };

  return (
    <div
      data-annotation-pin="true"
      onClick={handleClick}
      onDragStart={handleDragStart}
      draggable={!!onDragStart}
      className={cn(
        'absolute -translate-x-1/2 -translate-y-1/2 p-1 rounded-full shadow-lg transition-transform hover:scale-110 pointer-events-auto',
        user.color,
        (isNew || isSelected) && 'ring-2 ring-offset-2 ring-primary animate-pulse',
        !!onDragStart ? 'cursor-move' : 'cursor-pointer'
      )}
      style={{ left: `${comment.x}%`, top: `${comment.y}%` }}
    >
      <MessageSquare className={cn('h-4 w-4', user.textColor)} />
    </div>
  );
}
