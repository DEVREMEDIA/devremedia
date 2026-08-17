import Page from '@/app/client/invoices/[invoiceId]/page';

/** Ίδια σελίδα, μέσα στο νέο κέλυφος. */
export default function ClientV2InvoicesInvoiceIdPage(props: Parameters<typeof Page>[0]) {
  return <Page {...props} />;
}
