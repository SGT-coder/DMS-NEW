
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Underline, Palette, AtSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { User } from '@/app/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  users?: User[];
  [key: string]: any; // Allow other props like autoFocus
}

export const RichTextEditor = ({ value, onChange, placeholder, className, users = [], ...props }: RichTextEditorProps) => {
  const editorRef = React.useRef<HTMLDivElement>(null);
  const colorInputRef = React.useRef<HTMLInputElement>(null);
  
  const isInternalChange = React.useRef(false);
  const [mentionPopoverOpen, setMentionPopoverOpen] = React.useState(false);

  React.useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    isInternalChange.current = true;
    onChange(e.currentTarget.innerHTML);
  };
  
  const handleInsertMention = (user: User) => {
    const editor = editorRef.current;
    if (!editor) return;

    // By preventing default on the mousedown event of the trigger,
    // the editor should retain focus and its selection/cursor position.
    const mentionHtml = `<span contenteditable="false" data-mention="true" data-user-id="${user.id}" class="bg-accent text-accent-foreground rounded px-1 py-0.5" style="display:inline-block; user-select: none;">@${user.name}</span>&nbsp;`;
    document.execCommand('insertHTML', false, mentionHtml);
    
    setMentionPopoverOpen(false);
    isInternalChange.current = true;
    onChange(editor.innerHTML);
  };
  
  const handleCommand = (command: string, valueArg?: string) => {
    document.execCommand(command, false, valueArg);
    if (editorRef.current) {
        editorRef.current.focus();
        isInternalChange.current = true;
        onChange(editorRef.current.innerHTML);
    }
  };

  React.useEffect(() => {
    if (props.autoFocus && editorRef.current) {
      editorRef.current.focus();
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [props.autoFocus]);

  const fontSizes = [
    { label: 'Small', value: '2' },
    { label: 'Normal', value: '3' },
    { label: 'Large', value: '5' },
    { label: 'Huge', value: '7' },
  ];

  return (
    <div className="relative">
      <div className="flex flex-col rounded-md border border-input bg-background">
        <div className="flex items-center gap-1 border-b p-2 flex-wrap">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleCommand('bold')}
            aria-label="Bold"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleCommand('italic')}
            aria-label="Italic"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleCommand('underline')}
            aria-label="Underline"
          >
            <Underline className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => colorInputRef.current?.click()}
            aria-label="Text Color"
          >
            <Palette className="h-4 w-4" />
          </Button>
          <input
            type="color"
            ref={colorInputRef}
            onInput={(e) => handleCommand('foreColor', (e.target as HTMLInputElement).value)}
            className="absolute w-0 h-0 opacity-0"
          />
          <Select defaultValue="3" onValueChange={(size) => handleCommand('fontSize', size)}>
            <SelectTrigger
              className="h-7 w-28 text-xs"
              onMouseDown={(e) => e.preventDefault()}
              aria-label="Font size"
            >
              <SelectValue placeholder="Font size" />
            </SelectTrigger>
            <SelectContent>
              {fontSizes.map((size) => (
                <SelectItem key={size.value} value={size.value}>
                  {size.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          className={cn(
            'min-h-[80px] w-full bg-transparent px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
            !value && 'text-muted-foreground',
            className
          )}
          data-placeholder={placeholder}
          {...props}
        />
        {users.length > 0 && (
            <div className="flex items-center justify-end p-1 border-t">
                 <Popover open={mentionPopoverOpen} onOpenChange={setMentionPopoverOpen}>
                    <PopoverTrigger asChild>
                        <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground"
                        onMouseDown={(e) => e.preventDefault()}
                        aria-label="Mention User"
                        >
                        <AtSign className="h-4 w-4" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-1">
                        <div className="flex flex-col gap-1">
                        {users.map(user => (
                            <button
                                key={user.id}
                                type="button"
                                onClick={() => handleInsertMention(user)}
                                className="flex items-center gap-2 text-left p-2 rounded-md hover:bg-accent w-full"
                            >
                                <Avatar className="h-6 w-6">
                                    <AvatarFallback className={`${user.color} ${user.textColor} text-xs`}>{user.avatar}</AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{user.name}</span>
                            </button>
                        ))}
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        )}
        <style jsx>{`
          [contentEditable][data-placeholder]:empty:before {
            content: attr(data-placeholder);
            color: hsl(var(--muted-foreground));
            pointer-events: none;
            display: block; /* For line-break */
          }
          [data-mention] {
            user-select: none;
          }
        `}</style>
      </div>
    </div>
  );
};
