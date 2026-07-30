import Page from '@/app/admin/invoices/[invoiceId]/page';

/** Ίδια σελίδα, μέσα στο νέο κέλυφος. */
export default function AdminV2InvoicesInvoiceIdPage(props: Parameters<typeof Page>[0]) {
  return <Page {...props} />;
}
