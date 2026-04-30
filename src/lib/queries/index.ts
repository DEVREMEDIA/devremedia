'use server';

import { createClient } from '@/lib/supabase/server';
import type { ProjectStatus } from '@/lib/constants';
import type { ActivityLog } from '@/types';

export async function getRecentActivity(limit: number = 10): Promise<ActivityLog[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('activity_log')
      .select(
        'id, action, entity_type, entity_id, user_id, created_at, user:user_profiles(id, display_name, avatar_url)',
      )
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data as unknown as ActivityLog[];
  } catch {
    return [];
  }
}

export async function getProjectsByStatus(): Promise<Record<ProjectStatus, number>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('projects')
      .select('status')
      .neq('status', 'archived');

    if (error || !data) {
      return {
        briefing: 0,
        pre_production: 0,
        filming: 0,
        editing: 0,
        review: 0,
        revisions: 0,
        delivered: 0,
        archived: 0,
      };
    }

    const counts: Record<string, number> = {};
    data.forEach((project) => {
      counts[project.status] = (counts[project.status] || 0) + 1;
    });

    return {
      briefing: counts.briefing || 0,
      pre_production: counts.pre_production || 0,
      filming: counts.filming || 0,
      editing: counts.editing || 0,
      review: counts.review || 0,
      revisions: counts.revisions || 0,
      delivered: counts.delivered || 0,
      archived: counts.archived || 0,
    };
  } catch {
    return {
      briefing: 0,
      pre_production: 0,
      filming: 0,
      editing: 0,
      review: 0,
      revisions: 0,
      delivered: 0,
      archived: 0,
    };
  }
}
