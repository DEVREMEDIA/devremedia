'use client';

import { CheckSquare, Clock, Eye, CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { StatGrid } from '@/components/shared/stat-grid';
import { StatCard } from '@/components/shared/stat-card';

interface TaskStatsProps {
  stats: {
    todo: number;
    in_progress: number;
    review: number;
    done: number;
  };
}

export function TaskStats({ stats }: TaskStatsProps) {
  const t = useTranslations('employee.dashboard');

  // Χωρίς τόνο, επίτηδες. Πριν τη μετανάστευση το χρώμα ζούσε στο διακοσμητικό
  // πλακίδιο του εικονιδίου και ο ίδιος ο αριθμός ήταν πάντα ουδέτερος. Ο τόνος
  // πάνω στον αριθμό λέει κάτι για ΑΥΤΟΝ τον αριθμό — και ο resolver, που κρίνει
  // την κατάσταση και όχι το πλήθος, θα έσβηνε μόνιμα τα «Προς εκτέλεση» (η πιο
  // επείγουσα στήλη) και θα άναβε πράσινο σε «Ολοκληρωμένα: 0».
  const items = [
    { label: t('todoCount'), value: stats.todo, icon: CheckSquare },
    { label: t('inProgressCount'), value: stats.in_progress, icon: Clock },
    { label: t('reviewCount'), value: stats.review, icon: Eye },
    { label: t('doneCount'), value: stats.done, icon: CheckCircle2 },
  ];

  return (
    <StatGrid columns={4}>
      {items.map((item) => (
        <StatCard key={item.label} label={item.label} value={item.value} icon={item.icon} />
      ))}
    </StatGrid>
  );
}
