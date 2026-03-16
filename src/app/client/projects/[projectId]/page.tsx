import { createClient } from '@/lib/supabase/server';
import { getProject } from '@/lib/actions/projects';
import { getDeliverablesByProject } from '@/lib/actions/deliverables';
import { getContractsByProject } from '@/lib/actions/contracts';
import { redirect, notFound } from 'next/navigation';
import { ClientProjectDetail } from './client-project-detail';

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ClientProjectDetailPage({ params }: PageProps) {
  const { projectId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch project data
  const projectResult = await getProject(projectId);
  if (projectResult.error || !projectResult.data) {
    notFound();
  }

  const project = projectResult.data;

  // Fetch related data (RLS ensures client can only see their own projects)
  const deliverablesResult = await getDeliverablesByProject(projectId);
  const deliverables = (deliverablesResult.data ?? []) as import('@/types').Deliverable[];

  const contractsResult = await getContractsByProject(projectId);
  const contracts = (contractsResult.data ?? []) as import('@/types').ContractWithRelations[];

  return (
    <ClientProjectDetail
      project={project}
      deliverables={deliverables}
      contracts={contracts}
      currentUserId={user.id}
    />
  );
}
