'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { FileSignature, Eye, AlertCircle } from 'lucide-react';
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
import { getClients } from '@/lib/actions/clients';
import { createContractSchema } from '@/lib/schemas/contract';
import type { Contract, Project, Client } from '@/types';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';

const formSchema = createContractSchema;
type FormData = z.infer<typeof formSchema>;

interface ContractCreatorProps {
  project: Project & { client?: { contact_name?: string; company_name?: string } | null };
  onSuccess: (contract: Contract) => void;
  onCancel: () => void;
}

type Step = 'form' | 'preview';

export function ContractCreator({ project, onSuccess, onCancel }: ContractCreatorProps) {
  const t = useTranslations('contracts');
  const tc = useTranslations('common');

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
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(!project.client_id);

  // Pre-resolve clientName from project relation or from selected client
  const [selectedClientName, setSelectedClientName] = useState(
    project.client?.company_name || project.client?.contact_name || '',
  );

  // Load clients list only if project has no client (for inline selection)
  useEffect(() => {
    if (!project.client_id) {
      getClients().then((res) => {
        setClients((res.data ?? []) as Client[]);
        setLoadingClients(false);
      });
    }
  }, [project.client_id]);

  const {
    register,
    trigger,
    control,
    getValues,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      project_id: project.id,
      client_id: project.client_id ?? undefined,
      service_type: '',
      scope_description: '',
      agreed_amount: undefined,
      payment_method: undefined,
      special_terms: '',
      expires_at: '',
    },
  });

  const watchedClientId = watch('client_id');

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

  const onSubmit = async () => {
    setIsSubmitting(true);
    const data = getValues();

    const result = await createContract({
      project_id: data.project_id,
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
    onSuccess(result.data!);
  };

  /* ── Preview step ────────────────────────────────────── */
  if (step === 'preview') {
    const vals = getValues();
    const clientLabel = selectedClientName || watchedClientId || '—';
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
        projectLabel={project.title}
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
        onCancel={onCancel}
        onSubmit={onSubmit}
      />
    );
  }

  /* ── Form step ───────────────────────────────────────── */
  const clientName =
    project.client?.company_name || project.client?.contact_name || selectedClientName || '';

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
        <div className="flex items-start gap-3">
          <FileSignature className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground">{t('newServiceAgreement')}</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {clientName ? (
                <>
                  {tc('client')}: <strong>{clientName}</strong> — {project.title}
                </>
              ) : (
                <>
                  {tc('project')}: <strong>{project.title}</strong>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        {/* Client selector — only shown when project has no client_id */}
        {!project.client_id && (
          <div className="space-y-2">
            <Label>
              {t('client')} <span className="text-destructive">*</span>
            </Label>
            {loadingClients ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <LoadingSpinner size="sm" /> {t('loadingClients')}
              </div>
            ) : clients.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg border border-tone-caution/30 bg-tone-caution-bg p-3">
                <AlertCircle className="h-4 w-4 text-tone-caution shrink-0" />
                <p className="text-sm text-tone-caution">{t('noClientsFound')}</p>
              </div>
            ) : (
              <Controller
                name="client_id"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? ''}
                    onValueChange={(val) => {
                      field.onChange(val);
                      const c = clients.find((c) => c.id === val);
                      setSelectedClientName(c?.company_name || c?.contact_name || '');
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectClient')} />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.company_name
                            ? `${c.company_name} (${c.contact_name})`
                            : c.contact_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            )}
            {errors.client_id && (
              <p className="text-sm text-destructive">{errors.client_id.message}</p>
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
            {t('signatureDeadline')} ({tc('optional')})
          </Label>
          <Input id="expires_at" type="date" {...register('expires_at')} />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
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
