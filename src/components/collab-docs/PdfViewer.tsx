'use client';

import React from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Button } from '@/components/ui/button';
import { AnnotationPin } from './AnnotationPin';
import { ChevronLeft, ChevronRight, Loader2, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import type { Comment, User } from '@/app/types';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface PdfViewerProps {
  pdfFile: string | null;
  onDocumentLoad: (numPages: number) => void;
  onAddAnnotation: (x: number, y: number) => void;
  comments: Comment[];
  users: User[];
  newCommentPin: { x: number; y: number, userId: string } | null;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  selectedCommentId: string | null;
  onSelectComment: (commentId: string) => void;
  onMoveComment: (commentId: string, x: number, y: number) => void;
  onMoveNewCommentPin: (x: number, y: number) => void;
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  rotation: number;
  onRotate: () => void;
  isAddingCommentMode: boolean;
}

export function PdfViewer({ 
  pdfFile, 
  onDocumentLoad,
  onAddAnnotation, 
  comments, 
  users, 
  newCommentPin, 
  currentPage, 
  totalPages, 
  onPageChange,
  selectedCommentId,
  onSelectComment,
  onMoveComment,
  onMoveNewCommentPin,
  scale,
  onZoomIn,
  onZoomOut,
  rotation,
  onRotate,
  isAddingCommentMode
}: PdfViewerProps) {
  
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAddingCommentMode) return;

    if ((e.target as HTMLElement).closest('[data-annotation-pin]')) {
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onAddAnnotation(x, y);
  };
  
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    onDocumentLoad(numPages);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const commentId = e.dataTransfer.getData('text/plain');
    if (!commentId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    if (commentId === 'new-comment-pin') {
      onMoveNewCommentPin(x, y);
    } else {
      onMoveComment(commentId, x, y);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
  };


  return (
    <div className="flex flex-col items-center gap-4 h-full">
      <div
        className="w-full max-w-[800px] shadow-lg rounded-md border bg-gray-200"
      >
        <div
          className="relative mx-auto"
        >
          <Document
            file={pdfFile}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={<div className="flex items-center justify-center h-[70vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
            className="flex justify-center"
          >
            <Page 
              pageNumber={currentPage} 
              scale={scale}
              rotate={rotation}
              renderAnnotationLayer={false}
              renderTextLayer={true}
            />
          </Document>
          <div 
            className="absolute inset-0"
            style={{ cursor: isAddingCommentMode ? 'crosshair' : 'default' }}
            onClick={handleCanvasClick}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
              {comments.map(comment => (
              <AnnotationPin
                  key={comment.id}
                  comment={comment}
                  user={users.find(u => u.id === comment.userId)}
                  isSelected={comment.id === selectedCommentId}
                  onClick={() => onSelectComment(comment.id)}
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', comment.id)}
              />
              ))}
              {newCommentPin && (
              <AnnotationPin
                  isNew
                  comment={{...newCommentPin, id: 'new-comment-pin', page: currentPage, text:'', replies: [], timestamp: ''}}
                  user={users.find(u => u.id === newCommentPin.userId)}
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', 'new-comment-pin')}
              />
              )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-card p-2 rounded-lg shadow-md border">
        <Button
          variant="outline"
          size="icon"
          onClick={onRotate}
        >
          <RotateCw className="h-4 w-4" />
        </Button>
        <div className="h-6 border-l mx-2"></div>
        <Button
          variant="outline"
          size="icon"
          onClick={onZoomOut}
          disabled={scale <= 0.5}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="font-medium tabular-nums w-12 text-center">
          {Math.round(scale * 100)}%
        </span>
        <Button
          variant="outline"
          size="icon"
          onClick={onZoomIn}
          disabled={scale >= 3.0}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>

        <div className="h-6 border-l mx-2"></div>

        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-medium tabular-nums">
          Page {currentPage} of {totalPages || '...'}
        </span>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!totalPages || currentPage >= totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
