import { Suspense, type ComponentProps } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { SectionTabs, type SectionTab } from '@/components/shell-v2/section-tabs';
import { Button } from '@/components/ui/button';

import { ClientsContent } from '@/app/admin/clients/clients-content';
import { ProposalsList } from '@/app/admin/proposals/proposals-list';
import { ContractsListPage } from '@/app/admin/contracts/contracts-list-page';
import { AllLeadsTable } from '@/components/admin/leads/all-leads-table';
import { ChatbotStats } from '@/components/admin/chatbot/chatbot-stats';
import { ConversationsTable } from '@/components/admin/chatbot/conversations-table';
import { SalesFunnelCard } from '@/components/admin/dashboard/sales/sales-funnel-card';
import { RevenueForecastCard } from '@/components/admin/dashboard/sales/revenue-forecast-card';
import { CardSkeleton } from '@/components/admin/dashboard/shared/card-skeletons';

import { getClients } from '@/lib/actions/clients';
import { getProposals } from '@/lib/actions/proposals';
import { getAllContracts } from '@/lib/actions/contracts';
import { getLeads } from '@/lib/actions/leads';
import { getChatConversations, getChatStats } from '@/lib/queries/chatbot';
import { getAdminRole } from '@/lib/auth-helpers';
import type { Client, ChatConversation } from '@/types/index';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('shellV2.pages.adminClients');
  return { title: t('title') };
}

type SearchParams = Promise<{ tab?: string }>;

async function ListTab() {
  const result = await getClients();
  return <ClientsContent clients={(result.data as Client[]) ?? []} />;
}

async function InterestTab() {
  const [result, role] = await Promise.all([getLeads(), getAdminRole()]);
  const leads = (result.data ?? []) as unknown as ComponentProps<typeof AllLeadsTable>['leads'];
  return (
    <div className="space-y-6">
      {role === 'super_admin' && (
        <div className="grid gap-6 md:grid-cols-2">
          <Suspense fallback={<CardSkeleton rows={5} />}>
            <SalesFunnelCard />
          </Suspense>
          <Suspense fallback={<CardSkeleton rows={5} />}>
            <RevenueForecastCard />
          </Suspense>
        </div>
      )}
      <AllLeadsTable leads={leads} />
    </div>
  );
}

async function ProposalsTab() {
  const res = await getProposals();
  return <ProposalsList proposals={res.data ?? []} />;
}

async function ContractsTab() {
  const t = await getTranslations('shellV2.pages.adminClients');
  const result = await getAllContracts();
  const contracts = (result.data ?? []) as ComponentProps<typeof ContractsListPage>['contracts'];
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button asChild size="sm">
          <Link href="/admin-v2/contracts/new">{t('linkNewContract')}</Link>
        </Button>
      </div>
      <ContractsListPage contracts={contracts} />
    </div>
  );
}

async function ChatTab() {
  const t = await getTranslations('shellV2.pages.adminClients');
  const [conversations, stats] = await Promise.all([getChatConversations(), getChatStats()]);
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button asChild variant="outline" size="sm">
          <Link href="/admin-v2/chatbot/knowledge">{t('linkChatKnowledge')}</Link>
        </Button>
      </div>
      <ChatbotStats {...stats} />
      <ConversationsTable conversations={conversations as ChatConversation[]} />
    </div>
  );
}

export default async function ClientsPage({ searchParams }: { searchParams: SearchParams }) {
  const t = await getTranslations('shellV2.pages.adminClients');
  const TABS: SectionTab[] = [
    { key: 'list', label: t('tabList') },
    { key: 'interest', label: t('tabInterest') },
    { key: 'proposals', label: t('tabProposals') },
    { key: 'contracts', label: t('tabContracts') },
    { key: 'chat', label: t('tabChat') },
  ];
  const params = await searchParams;
  const active = TABS.some((tab) => tab.key === params.tab) ? (params.tab as string) : 'list';

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
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
