'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { createKbArticleSchema, type CreateKbArticleInput } from '@/lib/schemas/kb-article';
import { createKbArticle, updateKbArticle } from '@/lib/actions/kb-articles';
import {
  parseSections,
  serializeSections,
  createEmptySection,
  type ArticleSection,
} from '@/lib/article-sections';
import { Button } from '@/components/ui/button';
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
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { toast } from 'sonner';

const TiptapEditor = dynamic(
  () => import('@/components/shared/tiptap-editor').then((mod) => mod.TiptapEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[120px] border rounded-lg">
        <LoadingSpinner size="sm" />
      </div>
    ),
  },
);

interface Category {
  id: string;
  title: string;
  slug: string;
}

interface Article {
  id: string;
  category_id: string;
  title: string;
  slug: string;
  content: string;
  summary: string | null;
  video_urls: string[];
  published: boolean;
  sort_order: number;
}

interface ArticleFormProps {
  article?: Article | null;
  categories: Category[];
}

export function ArticleForm({ article, categories }: ArticleFormProps) {
  const router = useRouter();
  const t = useTranslations('university');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [videoUrls, setVideoUrls] = useState<string[]>(article?.video_urls ?? []);
  const isEditing = !!article;

  // Initialize sections from existing content or start with one empty section
  const [sections, setSections] = useState<ArticleSection[]>(() => {
    if (article?.content) {
      const parsed = parseSections(article.content);
      if (parsed && parsed.length > 0) return parsed;
    }
    return [createEmptySection()];
  });

  const form = useForm<CreateKbArticleInput>({
    resolver: zodResolver(createKbArticleSchema),
    defaultValues: {
      category_id: article?.category_id ?? '',
      title: article?.title ?? '',
      slug: article?.slug ?? '',
      content: article?.content ?? '',
      summary: article?.summary ?? '',
      video_urls: article?.video_urls ?? [],
      published: article?.published ?? false,
      sort_order: article?.sort_order ?? 0,
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

  const handleAddVideoUrl = () => {
    const newUrls = [...videoUrls, ''];
    setVideoUrls(newUrls);
    form.setValue('video_urls', newUrls);
  };

  const handleRemoveVideoUrl = (index: number) => {
    const newUrls = videoUrls.filter((_, i) => i !== index);
    setVideoUrls(newUrls);
    form.setValue('video_urls', newUrls);
  };

  const handleVideoUrlChange = (index: number, value: string) => {
    const newUrls = [...videoUrls];
    newUrls[index] = value;
    setVideoUrls(newUrls);
    form.setValue('video_urls', newUrls);
  };

  // Section management
  const addSection = () => {
    setSections((prev) => [...prev, createEmptySection()]);
  };

  const removeSection = (id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
  };

  const updateSection = (id: string, updates: Partial<ArticleSection>) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;
    setSections((prev) => {
      const copy = [...prev];
      [copy[index], copy[newIndex]] = [copy[newIndex], copy[index]];
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required form fields manually
    const values = form.getValues();
    if (!values.category_id) {
      toast.error('Επιλέξτε κατηγορία');
      return;
    }
    if (!values.title?.trim()) {
      toast.error('Ο τίτλος είναι υποχρεωτικός');
      return;
    }
    if (!values.slug?.trim()) {
      toast.error('Το slug είναι υποχρεωτικό');
      return;
    }

    // Validate sections
    const validSections = sections.filter((s) => s.title.trim());
    if (validSections.length === 0) {
      toast.error('Προσθέστε τουλάχιστον ένα section με τίτλο');
      return;
    }

    setIsSubmitting(true);

    const cleanedData = {
      ...values,
      content: serializeSections(validSections),
      video_urls: (values.video_urls ?? []).filter((url: string) => url.trim() !== ''),
    };

    const result =
      isEditing && article
        ? await updateKbArticle(article.id, cleanedData)
        : await createKbArticle(cleanedData);

    setIsSubmitting(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(isEditing ? 'Article updated' : 'Article created');
    router.push('/admin/university');
  };

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <FormField
          control={form.control}
          name="category_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectCategory')} />
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
                <Input placeholder="e.g., How to create a project" {...field} />
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
              <FormLabel>Slug</FormLabel>
              <FormControl>
                <Input placeholder="how-to-create-a-project" {...field} />
              </FormControl>
              <FormDescription>URL-friendly identifier (lowercase, hyphens only)</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="summary"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Summary</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t('articleSummaryPlaceholder')}
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Sections Editor */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <FormLabel className="text-base font-semibold">Sections</FormLabel>
            <Button type="button" variant="outline" size="sm" onClick={addSection}>
              <Plus className="h-4 w-4 mr-1" />
              Προσθήκη Section
            </Button>
          </div>

          {sections.map((section, index) => (
            <Card key={section.id} className="border-l-4 border-l-primary/30">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => moveSection(index, 'up')}
                      disabled={index === 0}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30 p-0.5"
                    >
                      <GripVertical className="h-3 w-3 rotate-180" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSection(index, 'down')}
                      disabled={index === sections.length - 1}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30 p-0.5"
                    >
                      <GripVertical className="h-3 w-3" />
                    </button>
                  </div>
                  <span className="text-xs font-bold text-muted-foreground shrink-0 w-6 text-center">
                    {index + 1}
                  </span>
                  <Input
                    value={section.title}
                    onChange={(e) => updateSection(section.id, { title: e.target.value })}
                    placeholder="Τίτλος section..."
                    className="font-semibold"
                  />
                  {sections.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSection(section.id)}
                      className="text-destructive hover:text-destructive shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <TiptapEditor
                  content={section.content}
                  onChange={(val) => updateSection(section.id, { content: val })}
                  placeholder="Περιεχόμενο section..."
                />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-2">
          <FormLabel>Video URLs (Optional)</FormLabel>
          <FormDescription>
            Add YouTube or Vimeo URLs to embed videos in the article
          </FormDescription>
          {videoUrls.map((url, index) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder="https://www.youtube.com/watch?v=..."
                value={url}
                onChange={(e) => handleVideoUrlChange(index, e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handleRemoveVideoUrl(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={handleAddVideoUrl}>
            <Plus className="h-4 w-4 mr-2" />
            Add Video URL
          </Button>
        </div>

        <FormField
          control={form.control}
          name="sort_order"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sort Order</FormLabel>
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
              <FormDescription>Lower numbers appear first</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="published"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Published</FormLabel>
                <FormDescription>Make this article visible to employees</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/admin/university')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <LoadingSpinner size="sm" />
                <span>Saving...</span>
              </div>
            ) : isEditing ? (
              'Update Article'
            ) : (
              'Create Article'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
