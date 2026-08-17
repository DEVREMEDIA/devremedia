import Page from '@/app/admin/projects/[projectId]/page';

/** Ίδια σελίδα, μέσα στο νέο κέλυφος. */
export default function AdminV2ProjectsProjectIdPage(props: Parameters<typeof Page>[0]) {
  return <Page {...props} />;
}
