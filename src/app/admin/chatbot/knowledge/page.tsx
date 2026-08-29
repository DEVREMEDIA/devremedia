import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { PageHeading } from '@/components/shared/page-heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KnowledgeTable } from '@/components/admin/chatbot/knowledge-table';
import { SeedKnowledgeButton } from '@/components/admin/chatbot/seed-knowledge-button';
import { getChatKnowledgeEntries } from '@/lib/queries/chatbot';

export default async function KnowledgeBasePage() {
  const [entries, t] = await Promise.all([getChatKnowledgeEntries(), getTranslations('chatbot')]);

  return (
    <div className="space-y-6">
      <PageHeading title={t('knowledgeBase')} subtitle={t('knowledgeBaseSubtitle')}>
        <div className="flex items-center gap-2">
          <SeedKnowledgeButton />
          <Link href="/admin/chatbot">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>
      </PageHeading>

      <Card>
        <CardHeader>
          <CardTitle>Knowledge Entries ({entries.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <KnowledgeTable
            entries={
              entries as {
                id: string;
                category: string;
                title: string;
                content: string;
                content_en: string | null;
                content_el: string | null;
              }[]
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
