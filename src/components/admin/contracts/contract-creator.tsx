'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  FileSignature,
  CheckCircle,
  Eye,
  Building2,
  Briefcase,
  CreditCard,
  Calendar,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
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

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Credit / Debit Card' },
  { value: 'installments', label: 'Installments' },
] as const;

const PAYMENT_LABEL: Record<string, string> = {
  bank_transfer: 'Bank Transfer',
  cash: 'Cash',
  card: 'Credit / Debit Card',
  installments: 'Installments',
};

type Step = 'form' | 'preview';

export function ContractCreator({ project, onSuccess, onCancel }: ContractCreatorProps) {
  const t = useTranslations('contracts');
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
      agreed_amount: undefined,
      payment_method: undefined,
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
      agreed_amount: Number(data.agreed_amount),
      payment_method: data.payment_method,
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
      <div className="space-y-5">
        <div>
          <h3 className="text-base font-semibold">Contract Preview</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Review before sending to the client
          </p>
        </div>

        {/* Preview card */}
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          {/* Header strip */}
          <div className="bg-slate-900 px-5 py-4 flex justify-between items-end">
            <div>
              <p className="text-white font-bold tracking-widest text-sm">DEVRE MEDIA</p>
              <p className="text-blue-300 text-[10px] tracking-widest mt-0.5">
                VIDEOGRAPHY &amp; PRODUCTION
              </p>
            </div>
            <div className="text-right">
              <p className="text-blue-300 text-[10px] tracking-widest font-semibold">
                SERVICE AGREEMENT
              </p>
              <p className="text-slate-500 text-[9px] mt-0.5">
                {format(new Date(), 'MMMM d, yyyy')}
              </p>
            </div>
          </div>
          <div className="h-0.5 bg-blue-600" />

          <div className="p-5 space-y-4">
            {/* Parties */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-slate-50 border-l-4 border-blue-600 px-4 py-3">
                <p className="text-[9px] text-muted-foreground tracking-widest mb-1 uppercase">
                  Service Provider
                </p>
                <p className="font-bold text-slate-900 text-sm">Devre Media</p>
                <p className="text-xs text-muted-foreground">Videography &amp; Production</p>
              </div>
              <div className="rounded-lg bg-slate-50 border-l-4 border-blue-600 px-4 py-3">
                <p className="text-[9px] text-muted-foreground tracking-widest mb-1 uppercase">
                  Client
                </p>
                <p className="font-bold text-slate-900 text-sm">{clientLabel}</p>
                <p className="text-xs text-muted-foreground">{project.title}</p>
              </div>
            </div>

            {/* Detail rows */}
            <div className="space-y-2.5">
              <DetailRow
                icon={<Briefcase className="h-3.5 w-3.5" />}
                label="Scope of Services"
                value={vals.service_type || '—'}
              />
              <DetailRow
                icon={<CreditCard className="h-3.5 w-3.5" />}
                label="Total Amount"
                value={amountFormatted}
                highlight
              />
              <DetailRow
                icon={<Building2 className="h-3.5 w-3.5" />}
                label="Payment Method"
                value={PAYMENT_LABEL[vals.payment_method ?? ''] ?? '—'}
              />
              {vals.expires_at && (
                <DetailRow
                  icon={<Calendar className="h-3.5 w-3.5" />}
                  label="Signature Deadline"
                  value={format(new Date(vals.expires_at), 'MMMM d, yyyy')}
                />
              )}
            </div>

            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <p className="text-xs text-green-700">
                A professional PDF contract with legal terms and signature section will be generated
                and made available to the client immediately.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-1 border-t">
          <Button variant="outline" onClick={() => setStep('form')} disabled={isSubmitting}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Edit
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={onSubmit} disabled={isSubmitting}>
              {isSubmitting && <LoadingSpinner size="sm" className="mr-2" />}
              Create &amp; Send Contract
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Form step ───────────────────────────────────────── */
  const clientName =
    project.client?.company_name || project.client?.contact_name || selectedClientName || '';

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
        <div className="flex items-start gap-3">
          <FileSignature className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-900">New Service Agreement</p>
            <p className="text-sm text-blue-700 mt-0.5">
              {clientName ? (
                <>
                  Client: <strong>{clientName}</strong> — {project.title}
                </>
              ) : (
                <>
                  Project: <strong>{project.title}</strong>
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
              Client <span className="text-red-500">*</span>
            </Label>
            {loadingClients ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <LoadingSpinner size="sm" /> Loading clients...
              </div>
            ) : clients.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                <p className="text-sm text-amber-700">
                  No clients found. Please create a client first.
                </p>
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
                      <SelectValue placeholder="Select a client..." />
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
            {errors.client_id && <p className="text-sm text-red-600">{errors.client_id.message}</p>}
          </div>
        )}

        {/* Service Type */}
        <div className="space-y-2">
          <Label htmlFor="service_type">
            Type of Service <span className="text-red-500">*</span>
          </Label>
          <Input
            id="service_type"
            {...register('service_type')}
            placeholder="e.g., Wedding Video Production, Corporate Event Coverage..."
          />
          {errors.service_type && (
            <p className="text-sm text-red-600">{errors.service_type.message}</p>
          )}
        </div>

        {/* Amount + Payment Method */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="agreed_amount">
              Agreed Amount (€) <span className="text-red-500">*</span>
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
              <p className="text-sm text-red-600">{errors.agreed_amount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>
              Payment Method <span className="text-red-500">*</span>
            </Label>
            <Controller
              name="payment_method"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
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
              <p className="text-sm text-red-600">{errors.payment_method.message}</p>
            )}
          </div>
        </div>

        {/* Signature Deadline */}
        <div className="space-y-2">
          <Label htmlFor="expires_at">Signature Deadline (Optional)</Label>
          <Input id="expires_at" type="date" {...register('expires_at')} />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={goToPreview}>
            <Eye className="h-4 w-4 mr-2" />
            Preview Contract
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Helper ──────────────────────────────────────────────── */
function DetailRow({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-slate-50 px-4 py-2.5">
      <span className="text-muted-foreground mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{label}</p>
        <p className={`text-sm font-semibold ${highlight ? 'text-blue-700' : 'text-slate-900'}`}>
          {value}
        </p>
      </div>
    </div>
  );
}
