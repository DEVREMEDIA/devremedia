'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { createExpenseSchema } from '@/lib/schemas/expense';
import { createExpense } from '@/lib/actions/expenses';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { z } from 'zod';
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS } from '@/lib/constants';
import { Upload } from 'lucide-react';
import { FormDialog } from '@/components/shared/form-dialog';

type ProjectOption = {
  id: string;
  title: string;
};

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: ProjectOption[];
  onSuccess: () => void;
}

type FormData = z.input<typeof createExpenseSchema>;

export function ExpenseForm({ open, onOpenChange, projects, onSuccess }: ExpenseFormProps) {
  const t = useTranslations('invoices');
  const tc = useTranslations('common');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: {
      category: 'other',
      description: '',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      project_id: undefined,
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);

    const result = await createExpense(data);
    setIsSubmitting(false);

    if (result.error) {
      toast.error(t('failedToCreateExpense'), { description: result.error });
    } else {
      toast.success(t('expenseCreatedSuccess'));
      form.reset();
      onSuccess();
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('addExpenseTitle')}
      onSubmit={form.handleSubmit(onSubmit)}
      submitLabel={isSubmitting ? t('creating') : t('addExpense')}
      cancelLabel={tc('cancel')}
      submitting={isSubmitting}
      className="max-w-md"
    >
      <Form {...form}>
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('expenseCategory')}</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectCategory')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {EXPENSE_CATEGORY_LABELS[category]}
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
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('descriptionOptional')}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t('enterExpenseDescription')}
                  className="min-h-[80px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('amountEur')}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('expenseDate')}</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="project_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('projectOptional')}</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectProject')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="">{t('noProject')}</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div>
          <FormLabel>{t('receiptUpload')}</FormLabel>
          <div className="mt-2">
            <Button type="button" variant="outline" disabled className="w-full">
              <Upload className="mr-2 h-4 w-4" />
              {t('uploadReceiptComingSoon')}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">{t('receiptUploadAvailableSoon')}</p>
          </div>
        </div>
      </Form>
    </FormDialog>
  );
}
