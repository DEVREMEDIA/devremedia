'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { createLeadSchema } from '@/lib/schemas/lead';
import { createLead, updateLead } from '@/lib/actions/leads';
import { LEAD_SOURCES, LEAD_SOURCE_LABELS } from '@/lib/constants';
import { z } from 'zod';
import type { Lead } from '@/types';

type LeadFormProps = {
  lead?: Lead;
  defaultAssignedTo: string;
};

export function LeadForm({ lead, defaultAssignedTo }: LeadFormProps) {
  const router = useRouter();
  const t = useTranslations('leads');
  const tToast = useTranslations('toast');
  const tCommon = useTranslations('common');
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.input<typeof createLeadSchema>>({
    resolver: zodResolver(createLeadSchema),
    defaultValues: lead
      ? {
          contact_name: lead.contact_name,
          email: lead.email,
          phone: lead.phone ?? undefined,
          company_name: lead.company_name ?? undefined,
          source: lead.source,
          deal_value: lead.deal_value ?? undefined,
          probability: lead.probability,
          expected_close_date: lead.expected_close_date ?? undefined,
          notes: lead.notes ?? undefined,
          assigned_to: lead.assigned_to,
        }
      : {
          contact_name: '',
          email: '',
          phone: undefined,
          company_name: undefined,
          source: 'other' as const,
          deal_value: undefined,
          probability: 0,
          expected_close_date: undefined,
          notes: undefined,
          assigned_to: defaultAssignedTo,
        },
  });

  const onSubmit = async (data: z.input<typeof createLeadSchema>) => {
    setIsLoading(true);

    try {
      const result = lead ? await updateLead(lead.id, data) : await createLead(data);

      if (result.error) {
        toast.error(lead ? tToast('updateError') : tToast('createError'), {
          description: result.error,
        });
      } else {
        toast.success(lead ? tToast('updateSuccess') : tToast('createSuccess'));
        router.push('/salesman/leads');
        router.refresh();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="contact_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('contactName')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('contactName')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('email')}</FormLabel>
                <FormControl>
                  <Input type="email" placeholder={t('email')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('phone')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('phone')} {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="company_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('companyName')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('companyName')} {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="source"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('source')}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('source')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {LEAD_SOURCES.map((source) => (
                      <SelectItem key={source} value={source}>
                        {LEAD_SOURCE_LABELS[source]}
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
            name="deal_value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('dealValue')}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="5000"
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                    value={
                      field.value !== null && field.value !== undefined ? String(field.value) : ''
                    }
                    name={field.name}
                    onBlur={field.onBlur}
                    ref={field.ref}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="probability"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('probability')}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="50"
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)}
                    value={typeof field.value === 'number' ? field.value : 0}
                    name={field.name}
                    onBlur={field.onBlur}
                    ref={field.ref}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="expected_close_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('expectedCloseDate')}</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('activityNotes')}</FormLabel>
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

        <div className="flex items-center gap-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {lead ? tCommon('update') : tCommon('create')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            {tCommon('cancel')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
