'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { FileSignature, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { ContractPreviewCard } from '@/components/admin/contracts/contract-preview-card';
import { createContract } from '@/lib/actions/contracts';
import { getProjects } from '@/lib/actions/projects';
import { createContractSchema } from '@/lib/schemas/contract';
import type { Client, Project } from '@/types';

const formSchema = createContractSchema;
type FormData = z.input<typeof formSchema>;

interface NewContractFormProps {
  clients: Client[];
  preselectedClientId?: string;
}

type Step = 'form' | 'preview';

export function NewContractForm({ clients, preselectedClientId }: NewContractFormProps) {
  const t = useTranslations('contracts');
  const tc = useTranslations('common');
  const router = useRouter();

  const PAYMENT_METHODS = [
    { value: 'bank_transfer', label: t('paymentBankTransfer') },
    { value: 'cash', label: t('paymentCash') },
    { value: 'card', label: t('paymentCard') },
    { value: 'installments', label: t('paymentInstallments') },
  ] as const;

  const PAYMENT_LABEL: Record<string, string> = {
    bank_transfer: t('paymentBankTransfer'),
    cash: t('paymentCash'),
    card: t('paymentCard'),
    installments: t('paymentInstallments'),
  };
  const [step, setStep] = useState<Step>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientProjects, setClientProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  const preselectedClient = preselectedClientId
    ? clients.find((c) => c.id === preselectedClientId)
    : undefined;

  const {
    register,
    trigger,
    control,
    getValues,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      client_id: preselectedClientId ?? undefined,
      project_id: undefined,
      service_type: '',
      scope_description: '',
      agreed_amount: undefined,
      payment_method: undefined,
      special_terms: '',
      expires_at: '',
    },
  });

  const watchedClientId = watch('client_id');

  // Fetch projects when client changes
  useEffect(() => {
    if (!watchedClientId) {
      setClientProjects([]);
      return;
    }
    setLoadingProjects(true);
    getProjects({ client_id: watchedClientId }).then((res) => {
      setClientProjects((res.data ?? []) as Project[]);
      setLoadingProjects(false);
    });
  }, [watchedClientId]);

  const selectedClientName = (() => {
    const c = clients.find((cl) => cl.id === watchedClientId);
    return c?.company_name || c?.contact_name || '';
  })();

  const goToPreview = async () => {
    const fields: (keyof FormData)[] = [
      'client_id',
      'service_type',
      'agreed_amount',
      'payment_method',
    ];
    const isValid = await trigger(fields);
    if (isValid) setStep('preview');
  };

  const handleCancel = () => {
    router.back();
  };

  const onSubmit = async () => {
    setIsSubmitting(true);
    const data = getValues();

    const result = await createContract({
      project_id: data.project_id || undefined,
      client_id: data.client_id,
      service_type: data.service_type,
      scope_description: data.scope_description || undefined,
      agreed_amount: Number(data.agreed_amount),
      payment_method: data.payment_method,
      special_terms: data.special_terms || undefined,
      expires_at: data.expires_at || undefined,
    });

    if (result.error) {
      toast.error(result.error);
      setIsSubmitting(false);
      return;
    }

    toast.success(t('contractCreated'));
    router.push(`/admin/contracts/${result.data!.id}`);
  };

  /* -- Preview step -- */
  if (step === 'preview') {
    const vals = getValues();
    const clientLabel = selectedClientName || '—';
    const projectLabel = clientProjects.find((p) => p.id === vals.project_id)?.title;
    const amountFormatted =
      vals.agreed_amount != null
        ? `€${Number(vals.agreed_amount).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`
        : '—';

    return (
      <ContractPreviewCard
        clientLabel={clientLabel}
        projectLabel={projectLabel}
        serviceType={vals.service_type ?? ''}
        scopeDescription={vals.scope_description || undefined}
        amountFormatted={amountFormatted}
        paymentMethodLabel={PAYMENT_LABEL[vals.payment_method ?? ''] ?? '—'}
        specialTerms={vals.special_terms || undefined}
        expiresAtFormatted={
          vals.expires_at ? format(new Date(vals.expires_at), 'MMMM d, yyyy') : undefined
        }
        dateFormatted={format(new Date(), 'MMMM d, yyyy')}
        isSubmitting={isSubmitting}
        onBack={() => setStep('form')}
        onCancel={handleCancel}
        onSubmit={onSubmit}
      />
    );
  }

  /* -- Form step -- */
  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
        <div className="flex items-start gap-3">
          <FileSignature className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground">{t('newContract')}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{t('newContractDescription')}</p>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        {/* Client selector */}
        <div className="space-y-2">
          <Label>
            {t('client')} <span className="text-destructive">*</span>
          </Label>
          <Controller
            name="client_id"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ?? ''}
                onValueChange={(val) => {
                  field.onChange(val);
                  setValue('project_id', undefined);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectClient')} />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.company_name ? `${c.company_name} (${c.contact_name})` : c.contact_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.client_id && (
            <p className="text-sm text-destructive">{errors.client_id.message}</p>
          )}
        </div>

        {/* Project selector (optional, shown when client is selected) */}
        {watchedClientId && (
          <div className="space-y-2">
            <Label>{t('selectProject')}</Label>
            {loadingProjects ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <LoadingSpinner size="sm" /> {tc('loading')}
              </div>
            ) : (
              <Controller
                name="project_id"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? '__none__'}
                    onValueChange={(val) => field.onChange(val === '__none__' ? undefined : val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('noProject')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">{t('noProject')}</SelectItem>
                      {clientProjects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            )}
          </div>
        )}

        {/* Service Type */}
        <div className="space-y-2">
          <Label htmlFor="service_type">
            {t('typeOfService')} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="service_type"
            {...register('service_type')}
            placeholder={t('serviceTypePlaceholder')}
          />
          {errors.service_type && (
            <p className="text-sm text-destructive">{errors.service_type.message}</p>
          )}
        </div>

        {/* Scope Description */}
        <div className="space-y-2">
          <Label htmlFor="scope_description">{t('scopeDescription')}</Label>
          <Textarea
            id="scope_description"
            {...register('scope_description')}
            placeholder={t('scopeDescriptionPlaceholder')}
            rows={4}
          />
          {errors.scope_description && (
            <p className="text-sm text-destructive">{errors.scope_description.message}</p>
          )}
        </div>

        {/* Amount + Payment Method */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="agreed_amount">
              {t('amount')} (€) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="agreed_amount"
              type="number"
              step="0.01"
              min="0"
              {...register('agreed_amount', { valueAsNumber: true })}
              placeholder="0.00"
            />
            {errors.agreed_amount && (
              <p className="text-sm text-destructive">{errors.agreed_amount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>
              {t('paymentMethod')} <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="payment_method"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectPaymentMethod')} />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.payment_method && (
              <p className="text-sm text-destructive">{errors.payment_method.message}</p>
            )}
          </div>
        </div>

        {/* Special Terms */}
        <div className="space-y-2">
          <Label htmlFor="special_terms">{t('specialTerms')}</Label>
          <Textarea
            id="special_terms"
            {...register('special_terms')}
            placeholder={t('specialTermsPlaceholder')}
            rows={4}
          />
          {errors.special_terms && (
            <p className="text-sm text-destructive">{errors.special_terms.message}</p>
          )}
        </div>

        {/* Signature Deadline */}
        <div className="space-y-2">
          <Label htmlFor="expires_at">
            {t('deadline')} ({tc('optional')})
          </Label>
          <Input id="expires_at" type="date" {...register('expires_at')} />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2 border-t">
          <Button type="button" variant="outline" onClick={handleCancel}>
            {tc('cancel')}
          </Button>
          <Button type="button" onClick={goToPreview}>
            <Eye className="h-4 w-4 mr-2" />
            {t('preview')}
          </Button>
        </div>
      </div>
    </div>
  );
}
