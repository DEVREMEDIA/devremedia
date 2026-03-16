'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { createClient } from '@/lib/supabase/client';
import { createDeliverable } from '@/lib/actions/deliverables';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Upload, X, FileVideo } from 'lucide-react';
import { cn } from '@/lib/utils';

type VideoUploadProps = {
  projectId: string;
  onUploadComplete: () => void;
};

export function VideoUpload({ projectId, onUploadComplete }: VideoUploadProps) {
  const t = useTranslations('deliverables');
  const tToast = useTranslations('toast');
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.type.startsWith('video/')) {
      toast.error(tToast('validationError'));
      return;
    }

    setFile(selectedFile);
    setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setTitle('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!file || !title.trim()) {
      toast.error(tToast('validationError'));
      return;
    }

    setIsUploading(true);

    try {
      const supabase = createClient();
      const path = `projects/${projectId}/v${Date.now()}/${file.name}`;

      const { error: uploadError } = await supabase.storage.from('deliverables').upload(path, file);

      if (uploadError) {
        throw uploadError;
      }

      const result = await createDeliverable({
        title: title.trim(),
        project_id: projectId,
        file_path: path,
        file_size: file.size,
        file_type: file.type,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      toast.success(tToast('uploadSuccess'));
      handleRemoveFile();
      onUploadComplete();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : t('uploadFailed'));
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t('uploadVideoDeliverable')}</h3>
      </div>

      {!file ? (
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50',
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-10 w-10 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-sm font-medium">{t('dragDropVideo')}</p>
              <p className="text-xs text-muted-foreground">{t('supportsAllFormats')}</p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileInputChange}
            className="hidden"
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4">
            <FileVideo className="h-10 w-10 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <div className="flex items-center gap-4 mt-1">
                <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                <p className="text-xs text-muted-foreground">{file.type}</p>
              </div>
            </div>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={handleRemoveFile}
              disabled={isUploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">{t('videoTitle')}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('enterVideoTitle')}
              disabled={isUploading}
            />
          </div>

          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('uploading')}</span>
              </div>
              <Progress value={undefined} className="h-2" />
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleRemoveFile} disabled={isUploading}>
              {t('cancel')}
            </Button>
            <Button onClick={handleUpload} disabled={isUploading || !title.trim()}>
              {isUploading ? t('uploading') : t('uploadVideo')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
