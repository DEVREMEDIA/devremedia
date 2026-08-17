import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronRight, Video } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getMyProjects } from '@/lib/queries/employee-dashboard';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/empty-state';

/**
 * Σήμερα τα παραδοτέα του εργαζομένου ζουν μόνο στο `/employee/deliverables/[projectId]`,
 * μια διαδρομή που δεν εμφανίζεται πουθενά στην πλοήγηση — φτάνεις μόνο από
 * σύνδεσμο ειδοποίησης. Αυτή η λίστα είναι η είσοδος που έλειπε: οι παραγωγές
 * του εργαζομένου με το πλήθος παραδοτέων και όσα ζητούν διόρθωση.
 */
export async function DeliverablesIndex() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const projects = await getMyProjects(user.id);

  if (projects.length === 0) {
    return (
      <EmptyState
        icon={Video}
        title="Καμία παραγωγή ακόμα"
        description="Μόλις σου ανατεθεί εργασία σε μια παραγωγή, τα παραδοτέα της θα εμφανιστούν εδώ."
      />
    );
  }

  const { data: deliverables } = await supabase
    .from('deliverables')
    .select('project_id, status')
    .in(
      'project_id',
      projects.map((p) => p.id),
    );

  const counts = new Map<string, { total: number; needsWork: number }>();
  for (const d of deliverables ?? []) {
    const entry = counts.get(d.project_id) ?? { total: 0, needsWork: 0 };
    entry.total += 1;
    if (d.status === 'revision_requested') entry.needsWork += 1;
    counts.set(d.project_id, entry);
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => {
        const { total, needsWork } = counts.get(project.id) ?? { total: 0, needsWork: 0 };

        return (
          <Link key={project.id} href={`/employee/deliverables/${project.id}`} className="group">
            <Card className="h-full transition-colors group-hover:border-primary/50">
              <CardContent className="flex items-start gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{project.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {total === 0
                      ? 'Κανένα παραδοτέο ακόμα'
                      : `${total} ${total === 1 ? 'παραδοτέο' : 'παραδοτέα'}`}
                  </p>
                  {needsWork > 0 && (
                    <span className="mt-2 inline-block rounded-md bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive">
                      {needsWork} {needsWork === 1 ? 'ζητά διόρθωση' : 'ζητούν διόρθωση'}
                    </span>
                  )}
                </div>
                <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
