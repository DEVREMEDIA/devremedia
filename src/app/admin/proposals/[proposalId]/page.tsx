import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getProposal } from '@/lib/actions/proposals';
import { getProposalPackages } from '@/lib/actions/proposal-packages';
import { ProposalDetail } from './proposal-detail';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ proposalId: string }>;
}): Promise<Metadata> {
  const { proposalId } = await params;
  const res = await getProposal(proposalId);
  const name = res.data?.client_name ?? 'Proposal';
  return { title: `${name} — Proposal` };
}

export default async function ProposalDetailPage({
  params,
}: {
  params: Promise<{ proposalId: string }>;
}) {
  const { proposalId } = await params;
  const [proposalRes, packagesRes] = await Promise.all([
    getProposal(proposalId),
    getProposalPackages({ include_inactive: true }),
  ]);

  if (proposalRes.error || !proposalRes.data) {
    notFound();
  }

  return <ProposalDetail proposal={proposalRes.data} packages={packagesRes.data ?? []} />;
}
