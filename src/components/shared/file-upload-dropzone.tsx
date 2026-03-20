'use client';

import * as React from 'react';
import { Upload, File, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface FileUploadDropzoneProps {
  accept?: Record<string, string[]>;
  maxSize?: number;
  multiple?: boolean;
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  className?: string;
}

export function FileUploadDropzone({
  accept,
  maxSize = 10 * 1024 * 1024, // 10MB default
  multiple = true,
  onFilesSelected,
  disabled = false,
  className,
}: FileUploadDropzoneProps) {
  const t = useTranslations('fileUpload');
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const validateFiles = (files: File[]): { valid: File[]; error?: string } => {
    setError(null);

    // Check file sizes
    const oversizedFiles = files.filter((file) => file.size > maxSize);
    if (oversizedFiles.length > 0) {
      return {
        valid: [],
        error: t('fileSizeExceeded', { size: Math.round(maxSize / 1024 / 1024) }),
      };
    }

    // Check file types if accept prop is provided
    if (accept) {
      const acceptedTypes = Object.values(accept).flat();
      const invalidFiles = files.filter((file) => {
        return !acceptedTypes.some((type) => {
          if (type.startsWith('.')) {
            return file.name.toLowerCase().endsWith(type.toLowerCase());
          }
          return file.type.match(new RegExp(type.replace('*', '.*')));
        });
      });

      if (invalidFiles.length > 0) {
        return {
          valid: [],
          error: t('invalidFileType'),
        };
      }
    }

    return { valid: files };
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    const { valid, error } = validateFiles(files);

    if (error) {
      setError(error);
      return;
    }

    onFilesSelected(valid);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || disabled) return;

    const files = Array.from(e.target.files);
    const { valid, error } = validateFiles(files);

    if (error) {
      setError(error);
      return;
    }

    onFilesSelected(valid);

    // Reset input
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.click();
    }
  };

  const acceptString = accept
    ? Object.entries(accept)
        .map(([mime, exts]) => [...exts, mime])
        .flat()
        .join(',')
    : undefined;

  return (
    <div className={cn('w-full', className)}>
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors',
          isDragOver && 'border-primary bg-primary/5',
          !isDragOver && 'border-muted-foreground/25 hover:border-muted-foreground/50',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={acceptString}
          onChange={handleFileInput}
          disabled={disabled}
          multiple={multiple}
        />

        <div className="flex flex-col items-center justify-center space-y-2 p-8 text-center">
          {isDragOver ? (
            <>
              <File className="h-10 w-10 text-primary" />
              <p className="text-sm font-medium text-primary">{t('dragAndDrop')}</p>
            </>
          ) : (
            <>
              <Upload className="h-10 w-10 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {t('dragAndDrop')} {t('or')} {t('browse')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('maxSize', { size: `${Math.round(maxSize / 1024 / 1024)}MB` })}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-2 flex items-center gap-2 text-sm text-destructive">
          <X className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
