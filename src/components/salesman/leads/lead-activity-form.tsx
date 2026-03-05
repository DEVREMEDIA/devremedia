'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createLeadActivitySchema } from '@/lib/schemas/lead-activity';
import { createLeadActivity } from '@/lib/actions/lead-activities';
import { LEAD_ACTIVITY_TYPES, LEAD_ACTIVITY_TYPE_LABELS } from '@/lib/constants';
import { z } from 'zod';

type LeadActivityFormProps = {
  leadId: string;
};

export function LeadActivityForm({ leadId }: LeadActivityFormProps) {
  const router = useRouter();
  const t = useTranslations('leads');
  const tToast = useTranslations('toast');
  const tCommon = useTranslations('common');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.input<typeof createLeadActivitySchema>>({
    resolver: zodResolver(createLeadActivitySchema),
    defaultValues: {
      lead_id: leadId,
      activity_type: 'note',
      title: '',
      description: '',
      metadata: {},
    },
  });

  const onSubmit = async (data: z.input<typeof createLeadActivitySchema>) => {
    setIsLoading(true);

    try {
      const result = await createLeadActivity(data);

      if (result.error) {
        toast.error(tToast('createError'), {
          description: result.error,
        });
      } else {
        toast.success(tToast('createSuccess'));
        setIsOpen(false);
        form.reset({
          lead_id: leadId,
          activity_type: 'note',
          title: '',
          description: '',
          metadata: {},
        });
        router.refresh();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {t('addActivity')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('addActivity')}</DialogTitle>
          <DialogDescription>{t('recordActivity')}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="activity_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('activityType')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('activityType')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {LEAD_ACTIVITY_TYPES.filter((type) => type !== 'stage_change').map((type) => (
                        <SelectItem key={type} value={type}>
                          {LEAD_ACTIVITY_TYPE_LABELS[type]}
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
                  <FormLabel>{tCommon('title')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('activityNotes')} {...field} />
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
                  <FormLabel>{tCommon('description')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('activityNotes')}
                      className="min-h-[100px]"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
              >
                {tCommon('cancel')}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('addActivity')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
