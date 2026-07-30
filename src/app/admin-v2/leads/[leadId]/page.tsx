import Page from '@/app/admin/leads/[leadId]/page';

/** Ίδια σελίδα, μέσα στο νέο κέλυφος. */
export default function AdminV2LeadsLeadIdPage(props: Parameters<typeof Page>[0]) {
  return <Page {...props} />;
}
