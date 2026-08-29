import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { TaskDetail } from '@/components/employee/tasks/task-detail';

export default async function EmployeeTaskDetailPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: task } = await supabase
    .from('tasks')
    .select('*, project:projects(id, title)')
    .eq('id', taskId)
    .eq('assigned_to', user.id)
    .single();

  if (!task) notFound();

  return <TaskDetail task={task} />;
}
