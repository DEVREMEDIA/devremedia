'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { createKbCategorySchema, type CreateKbCategoryInput } from '@/lib/schemas/kb-category';
import { createKbCategory, updateKbCategory } from '@/lib/actions/kb-categories';
import {
  Form,
  FormControl,
  FormDescription,
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
import { toast } from 'sonner';
import { FormDialog } from '@/components/shared/form-dialog';

interface Category {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  sort_order: number;
  parent_id: string | null;
}

interface CategoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
  categories: Category[];
  onSuccess: () => void;
}

export function CategoryForm({
  open,
  onOpenChange,
  category,
  categories,
  onSuccess,
}: CategoryFormProps) {
  const t = useTranslations('university');
  const tCommon = useTranslations('common');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!category;

  const form = useForm<CreateKbCategoryInput>({
    resolver: zodResolver(createKbCategorySchema),
    defaultValues: {
      title: '',
      description: '',
      slug: '',
      sort_order: 0,
      parent_id: null,
    },
  });

  // Auto-generate slug from title
  const watchTitle = form.watch('title');
  useEffect(() => {
    if (!isEditing && watchTitle) {
      const slug = watchTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      form.setValue('slug', slug);
    }
  }, [watchTitle, isEditing, form]);

  // Load category data when editing
  useEffect(() => {
    if (category) {
      form.reset({
        title: category.title,
        description: category.description ?? '',
        slug: category.slug,
        sort_order: category.sort_order,
        parent_id: category.parent_id,
      });
    } else {
      form.reset({
        title: '',
        description: '',
        slug: '',
        sort_order: 0,
        parent_id: null,
      });
    }
  }, [category, form]);

  const onSubmit = async (data: CreateKbCategoryInput) => {
    setIsSubmitting(true);

    const result =
      isEditing && category
        ? await updateKbCategory(category.id, data)
        : await createKbCategory(data);

    setIsSubmitting(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(isEditing ? t('categoryUpdated') : t('categoryCreated'));
    onOpenChange(false);
    form.reset();
    onSuccess();
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? t('editCategory') : t('addCategory')}
      description={isEditing ? t('editCategoryDescription') : t('newCategoryDescription')}
      onSubmit={form.handleSubmit(onSubmit)}
      submitLabel={
        isSubmitting ? tCommon('saving') : isEditing ? tCommon('update') : tCommon('create')
      }
      cancelLabel={tCommon('cancel')}
      submitting={isSubmitting}
      className="max-w-2xl"
    >
      <Form {...form}>
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{tCommon('title')}</FormLabel>
              <FormControl>
                <Input placeholder={t('titlePlaceholderExample')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('slug')}</FormLabel>
              <FormControl>
                <Input placeholder="getting-started" {...field} />
              </FormControl>
              <FormDescription>{t('slugDescription')}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{tCommon('description')}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t('categoryDescriptionPlaceholder')}
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="parent_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('parentCategoryOptional')}</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                value={field.value ?? 'none'}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectParentCategory')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">{tCommon('none')}</SelectItem>
                  {categories
                    .filter((c) => c.id !== category?.id)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.title}
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
          name="sort_order"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('sortOrder')}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="0"
                  name={field.name}
                  onBlur={field.onBlur}
                  ref={field.ref}
                  value={field.value as number}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                />
              </FormControl>
              <FormDescription>{t('sortOrderDescription')}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </Form>
    </FormDialog>
  );
}
