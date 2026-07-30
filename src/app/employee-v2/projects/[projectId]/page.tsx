import Page from '@/app/employee/projects/[projectId]/page';

/** Ίδια σελίδα, μέσα στο νέο κέλυφος. */
export default function EmployeeV2ProjectsProjectIdPage(props: Parameters<typeof Page>[0]) {
  return <Page {...props} />;
}
