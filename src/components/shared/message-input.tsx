'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip, X } from 'lucide-react';
import { toast } from 'sonner';
import { createMessage } from '@/lib/actions/messages';
import { createClient } from '@/lib/supabase/client';
import { STORAGE_BUCKETS, MAX_FILE_SIZES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Attachment } from '@/lib/schemas/message';
import { useTranslations } from 'next-intl';

interface MessageInputProps {
  projectId: string;
  channel?: 'client' | 'team';
  onMessageSent?: () => void;
  className?: string;
}

interface PendingFile {
  file: File;
  preview: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export function MessageInput({
  projectId,
  channel = 'client',
  onMessageSent,
  className,
}: MessageInputProps) {
  const t = useTranslations('messages');
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Validate file sizes
    const oversizedFiles = files.filter((f) => f.size > MAX_FILE_SIZES.attachment);
    if (oversizedFiles.length > 0) {
      toast.error(
        t('fileSizeExceeded', { size: Math.round(MAX_FILE_SIZES.attachment / 1024 / 1024) }),
      );
      return;
    }

    // Add files to pending list
    const newFiles = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setPendingFiles((prev) => [...prev, ...newFiles]);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setPendingFiles((prev) => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const uploadFiles = async (): Promise<Attachment[]> => {
    if (pendingFiles.length === 0) return [];

    setIsUploading(true);
    const supabase = createClient();
    const attachments: Attachment[] = [];

    try {
      for (const { file } of pendingFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `messages/${projectId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKETS.attachments)
          .upload(filePath, file);

        if (uploadError) {
          throw new Error(t('failedToUpload', { name: file.name }));
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from(STORAGE_BUCKETS.attachments).getPublicUrl(filePath);

        attachments.push({
          file_path: publicUrl,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
        });
      }

      return attachments;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSend = async () => {
    const trimmedContent = content.trim();

    if (!trimmedContent && pendingFiles.length === 0) {
      toast.error(t('enterMessageOrAttach'));
      return;
    }

    setIsSending(true);

    try {
      // Upload files first
      const attachments = await uploadFiles();

      // Send message
      const result = await createMessage({
        project_id: projectId,
        content: trimmedContent || t('attachment'),
        attachments: attachments.length > 0 ? attachments : undefined,
        channel,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      // Clear input
      setContent('');
      setPendingFiles((prev) => {
        prev.forEach((f) => URL.revokeObjectURL(f.preview));
        return [];
      });

      // Callback
      onMessageSent?.();

      // Focus back on textarea
      textareaRef.current?.focus();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('failedToSend'));
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isDisabled = isSending || isUploading;

  return (
    <div className={cn('border-t bg-background', className)}>
      {pendingFiles.length > 0 && (
        <div className="p-3 border-b bg-muted/30">
          <div className="flex flex-wrap gap-2">
            {pendingFiles.map((pending, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-3 py-2 bg-background rounded-lg border text-sm"
              >
                {pending.file.type.startsWith('image/') && (
                  <Image
                    src={pending.preview}
                    alt={pending.file.name}
                    width={32}
                    height={32}
                    className="h-8 w-8 object-cover rounded"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate max-w-[200px]">{pending.file.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatFileSize(pending.file.size)}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  disabled={isDisabled}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={isDisabled}
        />

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={isDisabled}
          className="flex-shrink-0"
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('typeMessage')}
          disabled={isDisabled}
          className="min-h-[44px] max-h-[200px] resize-none"
          rows={1}
        />

        <Button
          type="button"
          onClick={handleSend}
          disabled={isDisabled || (!content.trim() && pendingFiles.length === 0)}
          className="flex-shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
