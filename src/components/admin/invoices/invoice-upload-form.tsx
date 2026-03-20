'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { FileUploadDropzone } from '@/components/shared/file-upload-dropzone'
import { InvoiceReviewLayout } from '@/components/admin/invoices/invoice-review-layout'
import { createInvoice } from '@/lib/actions/invoices'
import { createClient } from '@/lib/supabase/client'
import type { ParsedInvoice } from '@/lib/invoice-parser'

interface InvoiceUploadFormProps {
  clientId: string
  projects: { id: string; title: string; client_id: string }[]
  nextInvoiceNumber: string
  onSuccess: () => void
  onStepChange?: (step: 'upload' | 'review') => void
}

const reviewFormSchema = z.object({
  issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD'),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD'),
  description: z.string().min(1, 'Description is required'),
  net_amount: z.coerce.number().min(0),
  vat_percent: z.coerce.number().min(0).max(100),
  vat_amount: z.coerce.number().min(0),
  total_amount: z.coerce.number().min(0),
  project_id: z.string().uuid().optional().or(z.literal('')),
  notes: z.string().max(2000).optional(),
  invoice_number: z.string().optional(),
  invoice_type: z.string().optional(),
  mark: z.string().optional(),
  issuer_name: z.string().optional(),
  issuer_afm: z.string().optional(),
})

type ReviewFormValues = z.input<typeof reviewFormSchema>

/** Compute due_date as issue_date + 30 days */
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function InvoiceUploadForm({
  clientId,
  projects,
  onSuccess,
  onStepChange,
}: InvoiceUploadFormProps) {
  const [step, setStep] = useState<'upload' | 'review'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      issue_date: new Date().toISOString().slice(0, 10),
      due_date: addDays(new Date().toISOString().slice(0, 10), 30),
      description: '',
      net_amount: 0,
      vat_percent: 24,
      vat_amount: 0,
      total_amount: 0,
      project_id: '',
      notes: '',
    },
  })

  const handleFileSelected = async (files: File[]) => {
    const pdf = files[0]
    if (!pdf) return

    setFile(pdf)
    setIsParsing(true)

    try {
      const formData = new FormData()
      formData.append('file', pdf)

      const response = await fetch('/api/invoices/parse', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error ?? 'Parse failed')
      }

      const parsed: ParsedInvoice = await response.json()
      const issueDate = parsed.date ?? new Date().toISOString().slice(0, 10)

      form.reset({
        issue_date: issueDate,
        due_date: addDays(issueDate, 30),
        description: parsed.description ?? '',
        net_amount: parsed.netAmount ?? 0,
        vat_percent: parsed.vatPercent ?? 24,
        vat_amount: parsed.vatAmount ?? 0,
        total_amount: parsed.totalAmount ?? 0,
        project_id: '',
        notes: '',
        invoice_number: parsed.invoiceNumber ?? '',
        invoice_type: parsed.invoiceType ?? '',
        mark: parsed.mark ?? '',
        issuer_name: parsed.issuerName ?? '',
        issuer_afm: parsed.issuerAfm ?? '',
      })
    } catch (err) {
      console.error('Parse error:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to parse invoice')
    } finally {
      setIsParsing(false)
      setStep('review')
      onStepChange?.('review')
    }
  }

  const handleSave = form.handleSubmit(async (values) => {
    if (!file) return
    setIsSaving(true)

    try {
      // 1. Upload PDF to Supabase Storage from browser
      const supabase = createClient()
      const invoiceId = crypto.randomUUID()
      const storagePath = `${clientId}/${invoiceId}.pdf`

      const { error: uploadError } = await supabase.storage
        .from('invoices')
        .upload(storagePath, file, { contentType: 'application/pdf' })

      let filePath: string | null = storagePath
      if (uploadError) {
        console.error('Storage upload failed:', uploadError)
        toast.error('PDF upload failed — invoice will be saved without file')
        filePath = null
      }

      // 2. Synthesize line item from parsed amounts
      const lineItem = {
        description: values.description || 'Υπηρεσία',
        quantity: 1,
        unit_price: values.net_amount,
      }

      // 3. Call createInvoice server action
      const result = await createInvoice({
        client_id: clientId,
        project_id: values.project_id || undefined,
        issue_date: values.issue_date,
        due_date: values.due_date || values.issue_date,
        line_items: [lineItem],
        tax_rate: values.vat_percent,
        notes: values.notes || undefined,
        file_path: filePath,
      })

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success('Invoice created')
      onSuccess()
    } catch (err) {
      console.error('Save error:', err)
      toast.error('Failed to save invoice')
    } finally {
      setIsSaving(false)
    }
  })

  const handleChangeFile = () => {
    setStep('upload')
    setFile(null)
    onStepChange?.('upload')
  }

  // Upload step
  if (step === 'upload') {
    return (
      <div className="space-y-4">
        {isParsing ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Ανάλυση τιμολογίου...</p>
          </div>
        ) : (
          <FileUploadDropzone
            accept={{ 'application/pdf': ['.pdf'] }}
            maxSize={10 * 1024 * 1024}
            multiple={false}
            onFilesSelected={handleFileSelected}
          />
        )}
      </div>
    )
  }

  // Review step — delegated to InvoiceReviewLayout
  if (!file) return null

  return (
    <InvoiceReviewLayout
      file={file}
      form={form}
      projects={projects}
      isSaving={isSaving}
      onSubmit={handleSave}
      onChangeFile={handleChangeFile}
    />
  )
}
