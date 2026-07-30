import Page from '@/app/admin/clients/[clientId]/page';

/** Ίδια σελίδα, μέσα στο νέο κέλυφος. */
export default function AdminV2ClientsClientIdPage(props: Parameters<typeof Page>[0]) {
  return <Page {...props} />;
}
