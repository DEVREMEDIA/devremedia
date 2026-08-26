import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { MyTaskList } from '@/components/employee/tasks/my-task-list';

export default async function EmployeeTasksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, project:projects(title)')
    .eq('assigned_to', user.id)
    .order('due_date', { ascending: true, nullsFirst: false });

  return (
    <div className="space-y-6">
      <MyTaskList tasks={tasks ?? []} />
    </div>
  );
}
