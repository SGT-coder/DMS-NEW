
import type { User, Comment } from '@/app/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { FileText, Download, Upload, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage, RGBColor } from 'pdf-lib';

// Helper function to convert hex color to RGB format for pdf-lib
const hexToRgb = (hex: string): RGBColor => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return rgb(0, 0, 0); // Default to black
  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;
  return rgb(r, g, b);
};

interface StyleState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  color: RGBColor;
  size: number;
}

interface DrawTextOptions {
  x: number;
  y: number;
  font: PDFFont;
  boldFont: PDFFont;
  italicFont: PDFFont;
  boldItalicFont: PDFFont;
  size: number;
  lineHeight: number;
  maxWidth: number;
  defaultColor: RGBColor;
}

const FONT_SIZE_MAP: { [key: string]: number } = {
  '1': 8,
  '2': 10,
  '3': 12,
  '4': 14,
  '5': 18,
  '6': 24,
  '7': 36,
};

const processCommentTextForPdf = (html: string): string => {
    // Convert custom mention spans into simple bold text for PDF rendering
    return html.replace(/<span contenteditable="false" data-mention="true"[^>]*>@([^<]+)<\/span>/g, '<b>@$1</b>');
};


// Helper function to draw formatted HTML text on a PDF page
const drawFormattedText = async (
  page: PDFPage,
  html: string,
  options: DrawTextOptions
): Promise<number> => {
  const { x, y, maxWidth, font, boldFont, italicFont, boldItalicFont, size, lineHeight, defaultColor } = options;

  let currentX = x;
  let currentY = y;
  let dynamicLineHeight = lineHeight;

  const preprocessedHtml = html.replace(/<div>/g, '').replace(/<\/div>/g, '\n').replace(/<br\s*\/?>/g, '\n');
  const lines = preprocessedHtml.split('\n');
  const lineHeightRatio = lineHeight / size;

  const styleStack: StyleState[] = [{ bold: false, italic: false, underline: false, color: defaultColor, size }];
  const getCurrentStyle = () => styleStack[styleStack.length - 1];

  for (const line of lines) {
    currentX = x;
    
    if (line.trim() === '') {
        currentY -= (dynamicLineHeight || lineHeight);
        continue;
    }

    // First pass on the line to determine the max font size for dynamic line height
    let maxFontSizeThisLine = size;
    const scanTokens = line.split(/(<[^>]+>)/g).filter(Boolean);
    const scanStyleStack = [{ size: size }];
    for (const token of scanTokens) {
        if (token.startsWith('<font')) {
            const currentStyle = { ...scanStyleStack[scanStyleStack.length - 1] };
            const sizeMatch = token.match(/size="([^"]+)"/);
            if (sizeMatch && FONT_SIZE_MAP[sizeMatch[1]]) {
                currentStyle.size = FONT_SIZE_MAP[sizeMatch[1]];
            }
            scanStyleStack.push(currentStyle);
            if (currentStyle.size > maxFontSizeThisLine) {
                maxFontSizeThisLine = currentStyle.size;
            }
        } else if (token === '</font>') {
            if (scanStyleStack.length > 1) {
                scanStyleStack.pop();
            }
        }
    }
    dynamicLineHeight = maxFontSizeThisLine * lineHeightRatio;

    const tokens = line.split(/(<[^>]+>)/g).filter(Boolean);

    for (const token of tokens) {
      if (token.startsWith('<') && token.endsWith('>')) {
        const tag = token.substring(1, token.length - 1).split(' ')[0].replace('/', '');
        const isClosing = token.startsWith('</');

        if (isClosing) {
          if (styleStack.length > 1) {
            styleStack.pop();
          }
        } else {
          const currentStyle = { ...getCurrentStyle() };
          if (tag === 'b') currentStyle.bold = true;
          if (tag === 'i') currentStyle.italic = true;
          if (tag === 'u') currentStyle.underline = true;
          if (token.startsWith('<font')) {
            const colorMatch = token.match(/color="([^"]+)"/);
            if (colorMatch) {
              currentStyle.color = hexToRgb(colorMatch[1]);
            }
            const sizeMatch = token.match(/size="([^"]+)"/);
            if (sizeMatch && FONT_SIZE_MAP[sizeMatch[1]]) {
                currentStyle.size = FONT_SIZE_MAP[sizeMatch[1]];
            }
          }
          styleStack.push(currentStyle);
        }
      } else {
        const text = token.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        if (!text) continue;

        const style = getCurrentStyle();
        let activeFont = font;
        if (style.bold && style.italic) activeFont = boldItalicFont;
        else if (style.bold) activeFont = boldFont;
        else if (style.italic) activeFont = italicFont;
        
        const currentFontSize = style.size;
        
        const words = text.split(/(\s+)/);
        for (const word of words) {
            if (word === '') continue;

            const wordWidth = activeFont.widthOfTextAtSize(word, currentFontSize);
            
            if (currentX > x && currentX + wordWidth > x + maxWidth) {
                currentX = x;
                currentY -= dynamicLineHeight;
            }

            page.drawText(word, {
                x: currentX,
                y: currentY,
                font: activeFont,
                size: currentFontSize,
                color: style.color,
            });
            
            if (style.underline) {
              page.drawLine({
                start: { x: currentX, y: currentY - 2 },
                end: { x: currentX + wordWidth, y: currentY - 2 },
                thickness: currentFontSize / 15,
                color: style.color,
              });
            }
            currentX += wordWidth;
        }
      }
    }
    currentY -= dynamicLineHeight;
  }
  return currentY + (dynamicLineHeight || lineHeight); 
};


interface HeaderProps {
  fileName: string;
  pdfFile: File | null;
  users: User[];
  activeUser: User;
  onUserChange: (user: User) => void;
  comments: Comment[];
  onNewUpload: () => void;
  onShare: () => void;
}

export function Header({ fileName, pdfFile, users, activeUser, onUserChange, comments, onNewUpload, onShare }: HeaderProps) {
  const { toast } = useToast();

  const tailwindToRgb = (tailwindColor: string): RGBColor => {
    // Note: This is a simplified mapping for the mock users.
    const colorMap: { [key: string]: [number, number, number] } = {
      'bg-red-400': [248, 113, 113],
      'bg-blue-400': [96, 165, 250],
      'bg-purple-400': [192, 132, 252],
      'bg-yellow-400': [250, 204, 21],
      'bg-teal-400': [45, 212, 191],
    };
    const match = Object.keys(colorMap).find(key => tailwindColor.includes(key));
    const [r, g, b] = match ? colorMap[match] : [0, 0, 0]; // Default to black
    return rgb(r / 255, g / 255, b / 255);
  };

  const handleExport = async (type: 'Flattened' | 'Printable') => {
    if (!pdfFile) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No PDF file is loaded to export.',
      });
      return;
    }

    toast({
      title: 'Exporting PDF...',
      description: `Generating your ${type.toLowerCase()} PDF. This may take a moment.`,
    });

    try {
      const existingPdfBytes = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
      const boldItalicFont = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);
      
      const black = rgb(0, 0, 0);

      const drawOptions = {
        font,
        boldFont,
        italicFont,
        boldItalicFont,
        defaultColor: black,
      };

      if (type === 'Flattened') {
        const pages = pdfDoc.getPages();
        for (const comment of comments) {
            const page = pages[comment.page - 1];
            if (!page) continue;

            const { width, height } = page.getSize();
            const x = (comment.x / 100) * width;
            const y = height - (comment.y / 100) * height;

            const user = users.find(u => u.id === comment.userId);
            if (!user) continue;

            const color = tailwindToRgb(user.color);
            page.drawCircle({ x, y, size: 5, color, borderWidth: 1, borderColor: black });

            let textY = y - 5;
            const textX = x + 15;
            const maxWidth = 150;
            
            const processedText = processCommentTextForPdf(comment.text);
            const mainCommentHtml = `<b>${user.name}:</b> ${processedText}`;
            textY = await drawFormattedText(page, mainCommentHtml, { ...drawOptions, x: textX, y: textY, size: 12, lineHeight: 14, maxWidth });

            for (const reply of comment.replies) {
                const replyUser = users.find(u => u.id === reply.userId);
                if (replyUser) {
                    const processedReplyText = processCommentTextForPdf(reply.text);
                    const replyHtml = `<b>${replyUser.name}:</b> ${processedReplyText}`;
                    textY = await drawFormattedText(page, replyHtml, { ...drawOptions, x: textX + 10, y: textY, size: 12, lineHeight: 14, maxWidth: maxWidth - 10 });
                }
            }
        }
      } else if (type === 'Printable') {
        let summaryPage = pdfDoc.addPage();
        let { height } = summaryPage.getSize();
        let currentY = height - 40;
        const margin = 40;
        const contentWidth = summaryPage.getWidth() - margin * 2;

        summaryPage.drawText('Comment Summary', { x: margin, y: currentY, font: boldFont, size: 24, color: black });
        currentY -= 30;

        for (const comment of comments) {
          if (currentY < 40) {
            summaryPage = pdfDoc.addPage();
            currentY = summaryPage.getHeight() - 40;
          }
          const user = users.find(u => u.id === comment.userId);
          const headerText = `Page ${comment.page} - ${user?.name || 'Unknown'}`;
          summaryPage.drawText(headerText, { x: margin, y: currentY, font: boldFont, size: 16, color: black });
          currentY -= 20;
          
          const processedCommentText = processCommentTextForPdf(comment.text);
          currentY = await drawFormattedText(summaryPage, processedCommentText, { ...drawOptions, x: margin + 10, y: currentY, size: 14, lineHeight: 16, maxWidth: contentWidth - 10 });
          currentY -= 5;

          for (const reply of comment.replies) {
            if (currentY < 40) {
              summaryPage = pdfDoc.addPage();
              currentY = summaryPage.getHeight() - 40;
            }
            const replyUser = users.find(u => u.id === reply.userId);
            const replyHeaderText = `- Reply from ${replyUser?.name || 'Unknown'}`;
            summaryPage.drawText(replyHeaderText, { x: margin, y: currentY, font: boldFont, size: 13, color: black });
            currentY -= 15;

            const processedReplyText = processCommentTextForPdf(reply.text);
            currentY = await drawFormattedText(summaryPage, processedReplyText, { ...drawOptions, x: margin + 20, y: currentY, size: 12, lineHeight: 14, maxWidth: contentWidth - 20 });
            currentY -= 5;
          }
          currentY -= 10; // Extra space
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${fileName.replace('.pdf', '')}-${type.toLowerCase()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      toast({
        title: 'Export Successful',
        description: `Your ${type.toLowerCase()} PDF has been downloaded.`,
      });

    } catch (err) {
      console.error("Failed to export PDF", err);
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: 'An unexpected error occurred while generating the PDF.',
      });
    }
  };
  
  return (
    <header className="flex-shrink-0 h-16 bg-card border-b flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-4">
        <h1 className="font-headline text-2xl text-primary hidden md:block">DMS</h1>
        <div className="flex items-center gap-2 text-muted-foreground">
          <FileText className="h-5 w-5" />
          <span className="font-medium text-foreground truncate max-w-xs">{fileName}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onNewUpload}>
          <Upload className="mr-2 h-4 w-4" />
          Upload New
        </Button>
        
        <Button variant="outline" size="sm" onClick={onShare}>
          <Share2 className="mr-2 h-4 w-4" />
          Share
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => handleExport('Printable')}>Printable PDF</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('Flattened')}>Flattened PDF</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className={`${activeUser.color} ${activeUser.textColor}`}>
                  {activeUser.avatar}
                </AvatarFallback>
              </Avatar>
              <span className="hidden md:inline">{activeUser.name}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>Switch User</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={activeUser.id} onValueChange={(id) => onUserChange(users.find(u => u.id === id)!)}>
              {users.map(user => (
                <DropdownMenuRadioItem key={user.id} value={user.id}>
                  <Avatar className="h-6 w-6 mr-2">
                     <AvatarFallback className={`${user.color} ${user.textColor} text-xs`}>{user.avatar}</AvatarFallback>
                  </Avatar>
                  {user.name}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
