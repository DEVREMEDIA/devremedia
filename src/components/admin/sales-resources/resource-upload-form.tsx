'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createSalesResource } from '@/lib/actions/sales-resources';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileUploadDropzone } from '@/components/shared/file-upload-dropzone';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

const uploadFormSchema = z.object({
  category_id: z.string().uuid('Please select a category'),
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().max(1000).optional().nullable(),
});

type UploadFormInput = z.input<typeof uploadFormSchema>;

interface Category {
  id: string;
  title: string;
}

interface ResourceUploadFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  onSuccess: () => void;
}

export function ResourceUploadForm({
  open,
  onOpenChange,
  categories,
  onSuccess,
}: ResourceUploadFormProps) {
  const t = useTranslations('salesResources');
  const tToast = useTranslations('toast');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const form = useForm<UploadFormInput>({
    resolver: zodResolver(uploadFormSchema),
    defaultValues: {
      category_id: '',
      title: '',
      description: '',
    },
  });

  const handleFilesSelected = (files: File[]) => {
    if (files.length > 0) {
      const file = files[0];
      setSelectedFile(file);
      // Auto-fill title if empty
      if (!form.getValues('title')) {
        form.setValue('title', file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const onSubmit = async (data: UploadFormInput) => {
    if (!selectedFile) {
      toast.error(tToast('validationError'));
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload file via API route (server-side, bypasses storage RLS)
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('category_id', data.category_id);

      const uploadRes = await fetch('/api/sales-resources/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadJson = await uploadRes.json();

      if (!uploadRes.ok) {
        toast.error(`Upload failed: ${uploadJson.error ?? 'Unknown error'}`);
        return;
      }

      // Create resource record in DB
      const result = await createSalesResource({
        category_id: data.category_id,
        title: data.title,
        description: data.description,
        file_path: uploadJson.path,
        file_name: uploadJson.fileName,
        file_size: uploadJson.fileSize,
        file_type: uploadJson.fileType,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(tToast('uploadSuccess'));
      onOpenChange(false);
      form.reset();
      setSelectedFile(null);
      onSuccess();
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Upload failed unexpectedly');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Resource</DialogTitle>
          <DialogDescription>Upload a new sales resource file</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('selectCategoryPlaceholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Pricing Sheet" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('resourceDescriptionPlaceholder')}
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormLabel>File</FormLabel>
              <FileUploadDropzone
                accept={{
                  'application/pdf': ['.pdf'],
                  'application/msword': ['.doc'],
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
                    '.docx',
                  ],
                  'application/vnd.ms-excel': ['.xls'],
                  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
                  'application/vnd.ms-powerpoint': ['.ppt'],
                  'application/vnd.openxmlformats-officedocument.presentationml.presentation': [
                    '.pptx',
                  ],
                  'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
                }}
                maxSize={50 * 1024 * 1024} // 50MB
                onFilesSelected={handleFilesSelected}
                disabled={isSubmitting}
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground mt-2">
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !selectedFile}>
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <LoadingSpinner size="sm" />
                    <span>Uploading...</span>
                  </div>
                ) : (
                  'Upload'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
