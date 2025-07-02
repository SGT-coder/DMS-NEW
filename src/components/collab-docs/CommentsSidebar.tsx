
import { useState, useEffect, useRef } from 'react';
import type { Comment, User } from '@/app/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CommentThread } from './CommentThread';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { PlusCircle } from 'lucide-react';
import { RichTextEditor } from './RichTextEditor';

interface CommentsSidebarProps {
  comments: Comment[];
  users: User[];
  activeUser: User;
  newCommentInfo: { x: number; y: number } | null;
  onSubmitNewComment: (text: string) => void;
  onCancelNewComment: () => void;
  onAddReply: (parentCommentId: string, text: string) => void;
  onEditComment: (commentId: string, text: string) => void;
  onDeleteComment: (commentId: string) => void;
  selectedCommentId: string | null;
  onSelectComment: (commentId: string) => void;
  onStartCommenting: () => void;
  isAddingCommentMode: boolean;
}

export function CommentsSidebar({
  comments,
  users,
  activeUser,
  newCommentInfo,
  onSubmitNewComment,
  onCancelNewComment,
  onAddReply,
  onEditComment,
  onDeleteComment,
  selectedCommentId,
  onSelectComment,
  onStartCommenting,
  isAddingCommentMode,
}: CommentsSidebarProps) {
  const [newCommentText, setNewCommentText] = useState('');
  const commentRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (selectedCommentId) {
      const selectedIndex = comments.findIndex(c => c.id === selectedCommentId);
      if (selectedIndex !== -1 && commentRefs.current[selectedIndex]) {
        commentRefs.current[selectedIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [selectedCommentId, comments]);

  useEffect(() => {
    if (newCommentInfo) {
      setNewCommentText('');
    }
  }, [newCommentInfo]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCommentText.trim()) {
      onSubmitNewComment(newCommentText);
      setNewCommentText('');
    }
  };

  return (
    <aside className="w-full md:w-96 bg-card border-l flex flex-col h-full">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="font-headline text-xl">Comments</h2>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={isAddingCommentMode ? 'default' : 'outline'}
            onClick={onStartCommenting}
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            New
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {newCommentInfo && (
            <form onSubmit={handleSubmit} className="p-4 border border-primary rounded-lg bg-primary/5 space-y-3">
              <h3 className="font-semibold">Add a new comment</h3>
              <RichTextEditor
                  value={newCommentText}
                  onChange={setNewCommentText}
                  autoFocus
                  placeholder={`Commenting as ${activeUser.name}...`}
                  users={users}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={onCancelNewComment}>Cancel</Button>
                <Button type="submit" disabled={!newCommentText.trim()}>Comment</Button>
              </div>
            </form>
          )}
          {comments.length > 0 ? (
             comments.map((comment, index) => (
              <div key={comment.id}>
                <CommentThread
                  ref={(el) => (commentRefs.current[index] = el)}
                  comment={comment}
                  users={users}
                  isSelected={comment.id === selectedCommentId}
                  onSelect={() => onSelectComment(comment.id)}
                  activeUser={activeUser}
                  onAddReply={onAddReply}
                  onEditComment={onEditComment}
                  onDeleteComment={onDeleteComment}
                  selectedCommentId={selectedCommentId}
                />
                 {index < comments.length - 1 && <Separator className="mt-4" />}
              </div>
            ))
          ) : (
            <div className="text-center text-muted-foreground py-10">
              <p>No comments on this page yet.</p>
              {isAddingCommentMode ? (
                 <p className="text-sm">Place your pin on the document!</p>
              ) : (
                 <p className="text-sm">Click 'New' to add one!</p>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
