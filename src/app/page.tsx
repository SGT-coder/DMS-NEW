
'use client';

import { useState, useRef, DragEvent, ChangeEvent, useMemo, useEffect } from 'react';
import type { User, Comment } from '@/app/types';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { Header } from '@/components/collab-docs/Header';
import { CommentsSidebar } from '@/components/collab-docs/CommentsSidebar';
import { useToast } from "@/hooks/use-toast";
import dynamic from 'next/dynamic';

const PdfViewer = dynamic(() => import('@/components/collab-docs/PdfViewer').then(mod => mod.PdfViewer), { 
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center gap-4 h-full">
      <div className="relative w-full max-w-[800px] shadow-lg rounded-md overflow-hidden bg-gray-200 flex items-center justify-center min-h-[70vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
      <div className="flex items-center gap-2 bg-card p-2 rounded-lg shadow-md border">
        <Button variant="outline" size="icon" disabled> <RotateCw className="h-4 w-4" /> </Button>
        <div className="h-6 border-l mx-2"></div>
        <Button variant="outline" size="icon" disabled> <ZoomOut className="h-4 w-4" /> </Button>
        <span className="font-medium tabular-nums w-12 text-center">...</span>
        <Button variant="outline" size="icon" disabled> <ZoomIn className="h-4 w-4" /> </Button>
        <div className="h-6 border-l mx-2"></div>
        <Button variant="outline" size="icon" disabled> <ChevronLeft className="h-4 w-4" /> </Button>
        <span className="font-medium tabular-nums"> Loading viewer... </span>
        <Button variant="outline" size="icon" disabled> <ChevronRight className="h-4 w-4" /> </Button>
      </div>
    </div>
  )
});


const mockUsers: User[] = [
  { id: '1', name: 'Alice', avatar: 'A', color: 'bg-red-400', textColor: 'text-white' },
  { id: '2', name: 'Bob', avatar: 'B', color: 'bg-blue-400', textColor: 'text-white' },
  { id: '4', name: 'You', avatar: 'Y', color: 'bg-purple-400', textColor: 'text-white' },
  { id: '5', name: 'Charlie', avatar: 'C', color: 'bg-yellow-400', textColor: 'text-white' },
  { id: '6', name: 'Diana', avatar: 'D', color: 'bg-teal-400', textColor: 'text-white' },
];

const initialComments: Comment[] = [];

export default function Home() {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [activeUser, setActiveUser] = useState<User>(mockUsers[2]); // Default to 'You'
  const [currentPage, setCurrentPage] = useState(1);
  const [newCommentInfo, setNewCommentInfo] = useState<{ page: number; x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [totalPages, setTotalPages] = useState(0);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [isAddingCommentMode, setIsAddingCommentMode] = useState(false);
  const [fileOwner, setFileOwner] = useState<User | null>(null);
  const [sharedWithUserIds, setSharedWithUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Cleanup object URL on component unmount
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);
  
  const handleFileSelect = (file: File | null) => {
    if (file && file.type === 'application/pdf') {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
      const newPdfUrl = URL.createObjectURL(file);
      setPdfFile(file);
      setPdfUrl(newPdfUrl);
      setCurrentPage(1);
      setComments([]);
      setNewCommentInfo(null);
      setSelectedCommentId(null);
      setScale(1.0);
      setRotation(0);
      setIsAddingCommentMode(false);
      
      setFileOwner(activeUser);
      setSharedWithUserIds(new Set([activeUser.id]));

      toast({ title: "Success", description: `${file.name} uploaded successfully.` });
    } else {
      toast({ variant: "destructive", title: "Error", description: "Please select a valid PDF file." });
    }
  };
  
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files?.[0] || null);
    if (e.target) {
      e.target.value = "";
    }
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files?.[0] || null);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleAddAnnotation = (x: number, y: number) => {
    setNewCommentInfo({ page: currentPage, x, y });
    setSelectedCommentId(null);
    setIsAddingCommentMode(false);
  };

  const handleStartCommenting = () => {
    setIsAddingCommentMode(true);
    setNewCommentInfo(null);
    toast({
      title: "Ready to comment",
      description: "Click anywhere on the document to add a new comment pin.",
    });
  };
  
  const handleCancelNewComment = () => {
    setNewCommentInfo(null);
    setIsAddingCommentMode(false);
  }

  const submitNewComment = (text: string) => {
    if (!newCommentInfo) return;

    const newComment: Comment = {
      id: `c${Date.now()}`,
      userId: activeUser.id,
      text,
      ...newCommentInfo,
      replies: [],
      timestamp: new Date().toISOString(),
    };

    setComments(prev => [...prev, newComment]);
    setNewCommentInfo(null);
    setIsAddingCommentMode(false);
    toast({ title: "Success", description: "Your comment has been added." });
    setSelectedCommentId(newComment.id);
  };

  const handleAddReply = (parentCommentId: string, text: string) => {
    const addReplyToComment = (comments: Comment[], parentId: string, replyText: string): Comment[] => {
      return comments.map(comment => {
        if (comment.id === parentId) {
          const newReply: Comment = {
            id: `c${Date.now()}`,
            userId: activeUser.id,
            text: replyText,
            page: comment.page,
            x: 0, 
            y: 0,
            replies: [],
            timestamp: new Date().toISOString(),
          };
          return { ...comment, replies: [...comment.replies, newReply] };
        }
        if (comment.replies.length > 0) {
          return { ...comment, replies: addReplyToComment(comment.replies, parentId, replyText) };
        }
        return comment;
      });
    };

    setComments(prev => addReplyToComment(prev, parentCommentId, text));
    toast({ title: "Success", description: "Your reply has been added." });
  };
  
  const handleEditComment = (commentId: string, newText: string) => {
    const editCommentInTree = (comments: Comment[], id: string, text: string): Comment[] => {
      return comments.map(comment => {
        if (comment.id === id) {
          return { ...comment, text: text };
        }
        if (comment.replies && comment.replies.length > 0) {
          return { ...comment, replies: editCommentInTree(comment.replies, id, text) };
        }
        return comment;
      });
    };

    setComments(prev => editCommentInTree(prev, commentId, newText));
    toast({ title: "Success", description: "Your comment has been updated." });
  };

  const handleDeleteComment = (commentId: string) => {
    const deleteCommentInTree = (comments: Comment[], id: string): Comment[] => {
      const newComments = comments.filter(c => c.id !== id);
      if (newComments.length < comments.length) {
        return newComments;
      }
      return comments.map(comment => {
        if (comment.replies && comment.replies.length > 0) {
          return { ...comment, replies: deleteCommentInTree(comment.replies, id) };
        }
        return comment;
      });
    };

    setComments(prev => deleteCommentInTree(prev, commentId));
    toast({ title: "Success", description: "The comment has been deleted." });
  };


  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
      setNewCommentInfo(null);
      setSelectedCommentId(null);
      setIsAddingCommentMode(false);
    }
  };

  const onDocumentLoad = (numPages: number) => {
    setTotalPages(numPages);
  }

  const handleSelectComment = (commentId: string) => {
    if (newCommentInfo) setNewCommentInfo(null);
    setSelectedCommentId(prevId => prevId === commentId ? null : commentId);
  }

  const handleMoveComment = (commentId: string, x: number, y: number) => {
    setComments(prev =>
      prev.map(comment =>
        comment.id === commentId ? { ...comment, x, y } : comment
      )
    );
    toast({ title: "Updated", description: "Comment position updated." });
  };
  
  const handleMoveNewCommentPin = (x: number, y: number) => {
    if (newCommentInfo) {
      setNewCommentInfo(info => ({...info!, x, y}));
    }
  }

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 3.0));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const availableUsers = useMemo(() => {
    if (!pdfFile) {
      return mockUsers;
    }
    return mockUsers.filter(u => sharedWithUserIds.has(u.id));
  }, [pdfFile, sharedWithUserIds]);

  useEffect(() => {
    if (pdfFile && availableUsers.length > 0 && !availableUsers.some(u => u.id === activeUser.id)) {
        setActiveUser(fileOwner || availableUsers[0]);
    }
  }, [availableUsers, activeUser, fileOwner, pdfFile]);

  const visibleComments = useMemo(() => {
    return comments.filter(c => c.page === currentPage);
  }, [comments, currentPage]);
  
  const handleShare = () => {
    const mentionedUserIds = new Set<string>();
    const mentionRegex = /data-user-id="([^"]+)"/g;

    const findMentions = (commentsToScan: Comment[]) => {
      for (const comment of commentsToScan) {
        let match;
        // Reset regex state for each new text string
        mentionRegex.lastIndex = 0; 
        while ((match = mentionRegex.exec(comment.text)) !== null) {
          mentionedUserIds.add(match[1]);
        }
        if (comment.replies && comment.replies.length > 0) {
          findMentions(comment.replies);
        }
      }
    };

    findMentions(comments);

    if (mentionedUserIds.size === 0) {
      toast({
        title: 'No mentions found',
        description: "Mention users with the '@' button to share.",
      });
      return;
    }

    const newSharedUserIds = new Set([...sharedWithUserIds, ...mentionedUserIds]);

    if (newSharedUserIds.size > sharedWithUserIds.size) {
      setSharedWithUserIds(newSharedUserIds);
      toast({
        title: 'Shared Successfully',
        description: `Access granted to ${newSharedUserIds.size - sharedWithUserIds.size} new user(s). They can now be selected in the 'Switch User' menu.`,
      });
    } else {
      toast({
        title: 'Already Shared',
        description: 'All mentioned users already have access.',
      });
    }
  };

  if (!pdfFile) {
    return (
      <main className="flex flex-col items-center justify-center h-full bg-background p-4">
        <div 
          className={`w-full max-w-2xl h-80 border-2 border-dashed rounded-lg flex flex-col items-center justify-center transition-colors ${isDragging ? 'border-primary bg-primary/10' : 'border-border'}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="text-center">
            <h1 className="font-headline text-5xl mb-2 text-primary">DMS</h1>
            <p className="text-muted-foreground mb-6">Upload a PDF to start annotating and collaborating.</p>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="application/pdf" className="hidden" />
            <Button onClick={handleUploadClick} size="lg">
              <Upload className="mr-2 h-5 w-5" />
              {isDragging ? 'Drop PDF here' : 'Select or Drop PDF'}
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="application/pdf" className="hidden" />
      <Header
        fileName={pdfFile.name}
        pdfFile={pdfFile}
        users={availableUsers}
        activeUser={activeUser}
        onUserChange={setActiveUser}
        comments={comments}
        onNewUpload={handleUploadClick}
        onShare={handleShare}
      />
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div className="flex-1 overflow-auto p-4 md:p-8">
          <PdfViewer
            pdfFile={pdfUrl}
            onDocumentLoad={onDocumentLoad}
            onAddAnnotation={handleAddAnnotation}
            comments={visibleComments}
            users={mockUsers}
            newCommentPin={newCommentInfo && newCommentInfo.page === currentPage ? {x: newCommentInfo.x, y: newCommentInfo.y, userId: activeUser.id} : null}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            selectedCommentId={selectedCommentId}
            onSelectComment={handleSelectComment}
            onMoveComment={handleMoveComment}
            onMoveNewCommentPin={handleMoveNewCommentPin}
            scale={scale}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            rotation={rotation}
            onRotate={handleRotate}
            isAddingCommentMode={isAddingCommentMode}
          />
        </div>
        <CommentsSidebar
          comments={visibleComments}
          users={mockUsers}
          activeUser={activeUser}
          newCommentInfo={newCommentInfo && newCommentInfo.page === currentPage ? newCommentInfo : null}
          onCancelNewComment={handleCancelNewComment}
          onSubmitNewComment={submitNewComment}
          onAddReply={handleAddReply}
          onEditComment={handleEditComment}
          onDeleteComment={handleDeleteComment}
          selectedCommentId={selectedCommentId}
          onSelectComment={handleSelectComment}
          onStartCommenting={handleStartCommenting}
          isAddingCommentMode={isAddingCommentMode}
        />
      </main>
    </div>
  );
}
