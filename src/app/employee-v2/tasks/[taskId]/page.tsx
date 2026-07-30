import Page from '@/app/employee/tasks/[taskId]/page';

/** Ίδια σελίδα, μέσα στο νέο κέλυφος. */
export default function EmployeeV2TasksTaskIdPage(props: Parameters<typeof Page>[0]) {
  return <Page {...props} />;
}
