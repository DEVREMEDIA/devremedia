import { createClient } from '@/lib/supabase/server';

export async function getMyTasksToday(userId: string) {
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('tasks')
    .select('*, project:projects(title)')
    .eq('assigned_to', userId)
    .eq('due_date', today)
    .neq('status', 'done')
    .order('created_at', { ascending: false });

  if (error) return [];
  return data ?? [];
}

export async function getMyOverdueTasks(userId: string) {
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('tasks')
    .select('*, project:projects(title)')
    .eq('assigned_to', userId)
    .lt('due_date', today)
    .neq('status', 'done')
    .order('due_date', { ascending: true });

  if (error) return [];
  return data ?? [];
}

export async function getMyUpcomingTasks(userId: string, days: number = 7) {
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  const future = futureDate.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('tasks')
    .select('*, project:projects(title)')
    .eq('assigned_to', userId)
    .gt('due_date', today)
    .lte('due_date', future)
    .neq('status', 'done')
    .order('due_date', { ascending: true });

  if (error) return [];
  return data ?? [];
}

export async function getMyProjects(userId: string) {
  const supabase = await createClient();

  // Get projects where employee has tasks assigned
  const { data: tasks } = await supabase
    .from('tasks')
    .select('project_id, project:projects(id, title, status, project_type, deadline)')
    .eq('assigned_to', userId);

  // Get projects directly assigned to employee
  const { data: assignedProjects, error: assignedError } = await supabase
    .from('projects')
    .select('id, title, status, project_type, deadline')
    .eq('assigned_to', userId);

  console.log('[DEBUG getMyProjects]', {
    userId,
    assignedProjects,
    assignedError,
    taskCount: tasks?.length,
  });

  // Build unified map
  const projectMap = new Map<
    string,
    {
      id: string;
      title: string;
      status: string;
      project_type: string;
      deadline: string | null;
      taskCount: number;
    }
  >();

  // Add task-based projects
  for (const task of tasks ?? []) {
    const project = task.project as unknown as {
      id: string;
      title: string;
      status: string;
      project_type: string;
      deadline: string | null;
    } | null;
    if (!project) continue;
    const existing = projectMap.get(project.id);
    if (existing) {
      existing.taskCount++;
    } else {
      projectMap.set(project.id, { ...project, taskCount: 1 });
    }
  }

  // Add directly assigned projects (if not already in map)
  for (const project of assignedProjects ?? []) {
    if (!projectMap.has(project.id)) {
      projectMap.set(project.id, { ...project, taskCount: 0 });
    }
  }

  return Array.from(projectMap.values());
}

export async function getMyTaskStats(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.from('tasks').select('status').eq('assigned_to', userId);

  if (error || !data) return { todo: 0, in_progress: 0, review: 0, done: 0 };

  const stats = { todo: 0, in_progress: 0, review: 0, done: 0 };
  for (const task of data) {
    if (task.status in stats) {
      stats[task.status as keyof typeof stats]++;
    }
  }
  return stats;
}
