import { getProject } from '@/lib/actions/projects';
import { getContractsByProject } from '@/lib/actions/contracts';
import { createClient } from '@/lib/supabase/server';
import { ProjectWithClient } from '@/types';
import { ProjectDetail, PROJECT_TABS } from './project-detail';
import { notFound } from 'next/navigation';

interface ProjectDetailPageProps {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export async function generateMetadata({ params }: ProjectDetailPageProps) {
  const { projectId } = await params;
  const result = await getProject(projectId);

  if (result.error) {
    return { title: 'Project Not Found' };
  }

  const project = result.data as ProjectWithClient;
  return { title: project.title };
}

export default async function ProjectDetailPage({ params, searchParams }: ProjectDetailPageProps) {
  const { projectId } = await params;
  const result = await getProject(projectId);

  if (result.error) {
    notFound();
  }

  const project = result.data as ProjectWithClient;

  // Fetch contracts for this project
  const contractsResult = await getContractsByProject(projectId);
  const contracts = contractsResult.data ?? [];

  // Άγνωστη καρτέλα πέφτει στην πρώτη, όπως ακριβώς κάνουν οι κόμβοι.
  const { tab } = await searchParams;
  const activeTab = PROJECT_TABS.includes(tab ?? '') ? (tab as string) : 'overview';

  // Ο χρήστης διαβάζεται εδώ αντί για ένα useEffect μέσα στην οθόνη: η καρτέλα
  // μηνυμάτων τον χρειάζεται για να ξέρει ποιος μιλά, και μέχρι τώρα έδειχνε
  // κενή κατάσταση όσο περίμενε ένα δεύτερο ταξίδι στον διακομιστή.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <ProjectDetail
      project={project}
      contracts={contracts}
      activeTab={activeTab}
      currentUserId={user?.id ?? null}
    />
  );
}
