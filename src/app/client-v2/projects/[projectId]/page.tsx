import Page from '@/app/client/projects/[projectId]/page';

/** Ίδια σελίδα, μέσα στο νέο κέλυφος. */
export default function ClientV2ProjectsProjectIdPage(props: Parameters<typeof Page>[0]) {
  return <Page {...props} />;
}
