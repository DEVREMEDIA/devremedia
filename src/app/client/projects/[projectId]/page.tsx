import { createClient } from '@/lib/supabase/server';
import { getProject } from '@/lib/actions/projects';
import { getDeliverablesByProject } from '@/lib/actions/deliverables';
import { getContractsByProject } from '@/lib/actions/contracts';
import { redirect, notFound } from 'next/navigation';
import { ClientProjectDetail, CLIENT_PROJECT_TABS } from './client-project-detail';

interface PageProps {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function ClientProjectDetailPage({ params, searchParams }: PageProps) {
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
  // Κανένα από τα δύο δεν περιμένει το άλλο· μόνο η σειρά των γραμμών τα
  // έβαζε στη σειρά.
  const [deliverablesResult, contractsResult] = await Promise.all([
    getDeliverablesByProject(projectId),
    getContractsByProject(projectId),
  ]);
  const deliverables = (deliverablesResult.data ?? []) as import('@/types').Deliverable[];
  const contracts = (contractsResult.data ?? []) as import('@/types').ContractWithRelations[];

  // Άγνωστη καρτέλα πέφτει στην πρώτη, όπως ακριβώς κάνουν οι κόμβοι.
  const { tab } = await searchParams;
  const activeTab = CLIENT_PROJECT_TABS.includes(tab ?? '') ? (tab as string) : 'overview';

  return (
    <ClientProjectDetail
      project={project}
      deliverables={deliverables}
      contracts={contracts}
      currentUserId={user.id}
      activeTab={activeTab}
    />
  );
}
