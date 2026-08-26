'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeading } from '@/components/shared/page-heading';

interface TableCount {
  table: string;
  count: number;
}

const TABLES = [
  'user_profiles',
  'clients',
  'projects',
  'tasks',
  'deliverables',
  'video_annotations',
  'invoices',
  'expenses',
  'messages',
  'contract_templates',
  'contracts',
  'filming_requests',
  'equipment_lists',
  'shot_lists',
  'concept_notes',
  'activity_log',
  'notifications',
];

export default function DevPage() {
  const [counts, setCounts] = useState<TableCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    async function fetchCounts() {
      const supabase = createClient();
      const results: TableCount[] = [];

      for (const table of TABLES) {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        results.push({ table, count: error ? -1 : (count ?? 0) });
      }

      setCounts(results);
      setLoading(false);
    }

    fetchCounts().catch((e) => {
      setError(e instanceof Error ? e.message : 'Failed to fetch counts');
      setLoading(false);
    });
  }, []);

  if (process.env.NODE_ENV !== 'development') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">This page is only available in development mode.</p>
      </div>
    );
  }

  const total = counts.reduce((sum, c) => sum + Math.max(c.count, 0), 0);

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <PageHeading title="Dev Tools" subtitle="Database status and development helpers" />

      {error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            Database Status
            <Badge variant={total > 0 ? 'default' : 'secondary'}>
              {loading ? 'Loading...' : `${total} total rows`}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Fetching table counts...</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {counts.map(({ table, count }) => (
                <div
                  key={table}
                  className="flex flex-col items-center rounded-lg border p-3 text-center"
                >
                  <span className="text-2xl font-bold">{count === -1 ? '?' : count}</span>
                  <span className="text-xs text-muted-foreground mt-1">
                    {table.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Reference</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>Reset DB:</strong> <code>supabase db reset</code> (runs migrations + seed.sql)
          </p>
          <p>
            <strong>Studio:</strong> <code>http://localhost:54323</code>
          </p>
          <p>
            <strong>API:</strong> <code>http://localhost:54321</code>
          </p>
          <p>
            <strong>Inbucket (email):</strong> <code>http://localhost:54324</code>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
