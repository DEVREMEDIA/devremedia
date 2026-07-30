import type { ComponentProps } from 'react';
import type { Metadata } from 'next';
import { SectionTabs, type SectionTab } from '@/components/admin-v2/section-tabs';

import { ClientsContent } from '@/app/admin/clients/clients-content';
import { ProposalsList } from '@/app/admin/proposals/proposals-list';
import { ContractsListPage } from '@/app/admin/contracts/contracts-list-page';
import { AllLeadsTable } from '@/components/admin/leads/all-leads-table';
import { ConversationsTable } from '@/components/admin/chatbot/conversations-table';

import { getClients } from '@/lib/actions/clients';
import { getProposals } from '@/lib/actions/proposals';
import { getAllContracts } from '@/lib/actions/contracts';
import { getLeads } from '@/lib/actions/leads';
import { getChatConversations } from '@/lib/queries/chatbot';
import type { Client, ChatConversation } from '@/types/index';

export const metadata: Metadata = { title: 'Πελάτες' };

const TABS: SectionTab[] = [
  { key: 'list', label: 'Πελάτες' },
  { key: 'interest', label: 'Ενδιαφέρον' },
  { key: 'proposals', label: 'Προτάσεις' },
  { key: 'contracts', label: 'Συμφωνητικά' },
  { key: 'chat', label: 'Συνομιλίες' },
];

type SearchParams = Promise<{ tab?: string }>;

async function ListTab() {
  const result = await getClients();
  return <ClientsContent clients={(result.data as Client[]) ?? []} />;
}

async function InterestTab() {
  const result = await getLeads();
  const leads = (result.data ?? []) as unknown as ComponentProps<typeof AllLeadsTable>['leads'];
  return <AllLeadsTable leads={leads} />;
}

async function ProposalsTab() {
  const res = await getProposals();
  return <ProposalsList proposals={res.data ?? []} />;
}

async function ContractsTab() {
  const result = await getAllContracts();
  const contracts = (result.data ?? []) as ComponentProps<typeof ContractsListPage>['contracts'];
  return <ContractsListPage contracts={contracts} />;
}

async function ChatTab() {
  const conversations = await getChatConversations();
  return <ConversationsTable conversations={conversations as ChatConversation[]} />;
}

export default async function ClientsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const active = TABS.some((t) => t.key === params.tab) ? (params.tab as string) : 'list';

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Πελάτες</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Από το πρώτο ενδιαφέρον μέχρι την ενεργή συνεργασία — μία λίστα, όχι δύο
        </p>
      </header>

      <SectionTabs basePath="/admin-v2/clients" tabs={TABS} active={active} />

      {active === 'list' && <ListTab />}
      {active === 'interest' && <InterestTab />}
      {active === 'proposals' && <ProposalsTab />}
      {active === 'contracts' && <ContractsTab />}
      {active === 'chat' && <ChatTab />}
    </div>
  );
}
