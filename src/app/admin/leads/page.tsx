import { PageHeader } from '@/components/shared/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AllLeadsTable } from '@/components/admin/leads/all-leads-table';
import { SalesReport } from '@/components/admin/leads/sales-report';
import { getLeads } from '@/lib/actions/leads';
import type { ComponentProps } from 'react';
import {
  getLeadsByStage,
  getConversionRate,
  getPipelineForecast,
  getLeadsBySalesman,
  getLeadsBySource,
} from '@/lib/queries/leads';

export default async function AdminLeadsPage() {
  const [leadsResult, stageData, conversionRate, forecast, salesmanData, sourceData] =
    await Promise.all([
      getLeads(),
      getLeadsByStage(),
      getConversionRate(),
      getPipelineForecast(),
      getLeadsBySalesman(),
      getLeadsBySource(),
    ]);

  const leads = leadsResult.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        description="View all leads and sales performance across the team"
      />

      <Tabs defaultValue="leads" className="space-y-6">
        <TabsList>
          <TabsTrigger value="leads">All Leads</TabsTrigger>
          <TabsTrigger value="reports">Sales Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="leads">
          <AllLeadsTable leads={leads as ComponentProps<typeof AllLeadsTable>['leads']} />
        </TabsContent>

        <TabsContent value="reports">
          <SalesReport
            stageData={stageData}
            conversionRate={conversionRate}
            forecast={forecast}
            salesmanData={salesmanData}
            sourceData={sourceData}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
