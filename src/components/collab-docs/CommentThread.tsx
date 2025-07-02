
import type { Comment, User } from '@/app/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import React, { useState } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { formatDistanceToNow } from 'date-fns';
import { RichTextEditor } from './RichTextEditor';

interface CommentThreadProps {
  comment: Comment;
  users: User[];
  isReply?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  activeUser: User;
  onAddReply: (parentCommentId: string, text: string) => void;
  onEditComment: (commentId: string, text: string) => void;
  onDeleteComment: (commentId: string) => void;
  selectedCommentId: string | null;
}

export const CommentThread = React.forwardRef<HTMLDivElement, CommentThreadProps>(({ 
  comment, users, isReply = false, isSelected, onSelect,
  activeUser, onAddReply, onEditComment, onDeleteComment, selectedCommentId
}, ref) => {
  const user = users.find(u => u.id === comment.userId);

  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const canInteract = activeUser.id === comment.userId;

  if (!user) return null;

  const handleStartReply = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsReplying(true);
  };
  
  const handleCancelReply = () => {
    setIsReplying(false);
    setReplyText('');
  };

  const handleSubmitReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (replyText.trim()) {
      onAddReply(comment.id, replyText);
      handleCancelReply();
    }
  };
  
  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditText(comment.text);
  };
  
  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editText.trim()) {
      onEditComment(comment.id, editText);
      handleCancelEdit();
    }
  };
  
  const handleDelete = () => {
    onDeleteComment(comment.id);
    setShowDeleteConfirm(false);
  }

  const formattedTimestamp = React.useMemo(() => {
    try {
      return formatDistanceToNow(new Date(comment.timestamp), { addSuffix: true });
    } catch (e) {
      return comment.timestamp; // Fallback for invalid date
    }
  }, [comment.timestamp]);

  return (
    <>
      <div
        ref={ref}
        className={cn(
          `flex flex-col gap-2`,
          isReply ? 'ml-6' : '',
        )}
      >
          <div 
            onClick={onSelect}
            className={cn(
              'p-2 rounded-lg transition-colors',
              onSelect && 'cursor-pointer',
              isSelected ? 'bg-primary/10 border border-primary' : 'border border-transparent hover:bg-secondary/50'
            )}
          >
            <div className="flex gap-3">
                <Avatar className="h-8 w-8">
                    <AvatarFallback className={`${user.color} ${user.textColor} text-sm`}>
                    {user.avatar}
                    </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                        <span className="font-semibold text-sm">{user.name}</span>
                        <span className="text-xs text-muted-foreground">{formattedTimestamp}</span>
                    </div>
                    {!isEditing ? (
                      <>
                        <div className="bg-secondary p-3 rounded-lg mt-1 max-w-none">
                           <div
                              className="text-base text-foreground whitespace-pre-wrap leading-relaxed"
                              dangerouslySetInnerHTML={{ __html: comment.text }}
                            />
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          {!isReplying && (
                            <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={handleStartReply}>
                              Reply
                            </Button>
                          )}
                          {canInteract && !isReplying && (
                            <>
                              <span className="text-muted-foreground">&middot;</span>
                              <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={handleStartEdit}>
                                Edit
                              </Button>
                              <span className="text-muted-foreground">&middot;</span>
                              <Button variant="link" size="sm" className="p-0 h-auto text-xs text-destructive hover:text-destructive/80" onClick={() => setShowDeleteConfirm(true)}>
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </>
                    ) : (
                      <form onSubmit={handleSubmitEdit} className="mt-2 space-y-2">
                        <RichTextEditor
                           value={editText}
                           onChange={setEditText}
                           autoFocus
                           users={users}
                        />
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="ghost" size="sm" onClick={handleCancelEdit}>Cancel</Button>
                          <Button type="submit" size="sm" disabled={!editText.trim() || editText === comment.text}>Save</Button>
                        </div>
                      </form>
                    )}
                </div>
            </div>
          </div>
          
          {isReplying && (
            <form onSubmit={handleSubmitReply} className="ml-11 space-y-2">
              <RichTextEditor
                  value={replyText}
                  onChange={setReplyText}
                  autoFocus
                  placeholder={`Replying as ${activeUser.name}...`}
                  users={users}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={handleCancelReply}>Cancel</Button>
                <Button type="submit" size="sm" disabled={!replyText.trim()}>Reply</Button>
              </div>
            </form>
          )}

          {comment.replies && comment.replies.length > 0 && (
            <div className="flex flex-col gap-2 pt-2">
                {comment.replies.map(reply => (
                    <CommentThread 
                        key={reply.id} 
                        comment={reply} 
                        users={users} 
                        isReply={true} 
                        activeUser={activeUser}
                        onAddReply={onAddReply}
                        onEditComment={onEditComment}
                        onDeleteComment={onDeleteComment}
                        selectedCommentId={selectedCommentId}
                    />
                ))}
            </div>
          )}
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this comment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className={buttonVariants({ variant: "destructive" })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});

CommentThread.displayName = 'CommentThread';
