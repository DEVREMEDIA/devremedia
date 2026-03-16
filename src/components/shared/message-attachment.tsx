'use client';

import { FileIcon, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Attachment } from '@/lib/schemas/message';
import Image from 'next/image';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface MessageAttachmentProps {
  attachment: Attachment;
  className?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function isImageFile(fileType: string): boolean {
  return fileType.startsWith('image/');
}

export function MessageAttachment({ attachment, className }: MessageAttachmentProps) {
  const [imageError, setImageError] = useState(false);
  const isImage = isImageFile(attachment.file_type) && !imageError;

  const handleDownload = async () => {
    try {
      const supabase = createClient();
      const { data: signedUrlData } = await supabase.storage
        .from('messages')
        .createSignedUrl(attachment.file_path, 3600); // 1 hour expiry

      if (signedUrlData?.signedUrl) {
        window.open(signedUrlData.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  if (isImage) {
    return (
      <div className={cn('relative rounded-lg overflow-hidden border bg-muted', className)}>
        <Image
          src={attachment.file_path}
          alt={attachment.file_name}
          width={300}
          height={200}
          className="object-cover w-full h-auto max-h-48"
          onError={() => setImageError(true)}
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
          <div className="flex items-center justify-between text-white text-xs">
            <span className="truncate flex-1">{attachment.file_name}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="h-6 w-6 p-0 hover:bg-white/20"
            >
              <Download className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border bg-muted hover:bg-muted/80 transition-colors',
        className,
      )}
    >
      <div className="flex-shrink-0">
        <FileIcon className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{attachment.file_name}</div>
        <div className="text-xs text-muted-foreground">{formatFileSize(attachment.file_size)}</div>
      </div>
      <Button variant="ghost" size="sm" onClick={handleDownload} className="flex-shrink-0">
        <Download className="h-4 w-4" />
      </Button>
    </div>
  );
}
