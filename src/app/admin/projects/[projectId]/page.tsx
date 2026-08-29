import { getProject } from '@/lib/actions/projects';
import { getContractsByProject } from '@/lib/actions/contracts';
import { createClient } from '@/lib/supabase/server';
import { ProjectWithClient } from '@/types';
import { ProjectDetail } from './project-detail';
import { notFound } from 'next/navigation';

/** Οι καρτέλες με τη σειρά τους. Ο server επικυρώνει εδώ το `?tab=`· από αρχείο 'use client' θα ερχόταν ως client reference. */
const PROJECT_TABS: readonly string[] = [
  'overview',
  'tasks',
  'deliverables',
  'messages',
  'invoices',
  'contracts',
];

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

  // Ο χρήστης διαβάζεται εδώ αντί για ένα useEffect μέσα στην οθόνη: η καρτέλα
  // μηνυμάτων τον χρειάζεται για να ξέρει ποιος μιλά, και μέχρι τώρα έδειχνε
  // κενή κατάσταση όσο περίμενε ένα δεύτερο ταξίδι στον διακομιστή.
  const supabase = await createClient();

  // Τρία ανεξάρτητα ταξίδια στον διακομιστή (project, contracts, user) γίνονταν
  // το ένα μετά το άλλο· τώρα ταξιδεύουν μαζί. Κανένα δεν εξαρτάται από το
  // αποτέλεσμα κάποιου άλλου — το contracts φιλτράρει με το projectId του route,
  // όχι με δεδομένα του project, και ο δικός του requireUser() ελέγχει την
  // εξουσιοδότηση μόνος του.
  const [result, contractsResult, userResult] = await Promise.all([
    getProject(projectId),
    getContractsByProject(projectId),
    supabase.auth.getUser(),
  ]);

  if (result.error) {
    notFound();
  }

  const project = result.data as ProjectWithClient;
  const contracts = contractsResult.data ?? [];
  const user = userResult.data.user;

  // Άγνωστη καρτέλα πέφτει στην πρώτη, όπως ακριβώς κάνουν οι κόμβοι.
  const { tab } = await searchParams;
  const activeTab = PROJECT_TABS.includes(tab ?? '') ? (tab as string) : 'overview';

  return (
    <ProjectDetail
      project={project}
      contracts={contracts}
      activeTab={activeTab}
      currentUserId={user?.id ?? null}
    />
  );
}
