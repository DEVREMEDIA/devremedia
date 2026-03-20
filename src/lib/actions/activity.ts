'use server';

import { createClient as createSupabase } from '@/lib/supabase/server';
import type { ActionResult } from '@/types/index';
import type { ActivityLogWithUser } from '@/types/relations';

interface ActivityFilters {
  limit?: number;
  offset?: number;
}

export async function getActivityByClient(
  clientId: string,
  filters?: ActivityFilters,
): Promise<ActionResult<ActivityLogWithUser[]>> {
  try {
    const supabase = await createSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };

    const limit = filters?.limit ?? 20;
    const offset = filters?.offset ?? 0;

    // Get all project IDs for this client
    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .eq('client_id', clientId);

    const projectIds = (projects ?? []).map((p) => p.id);

    // Build filter: client entity OR project entities
    // activity_log has entity_type + entity_id but no client_id column
    let query = supabase
      .from('activity_log')
      .select(
        'id, entity_type, entity_id, action, user_id, changes, created_at, user:user_profiles(id, display_name, avatar_url, role)',
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (projectIds.length > 0) {
      // Client-related OR project-related activity
      query = query.or(
        `and(entity_type.eq.client,entity_id.eq.${clientId}),and(entity_type.eq.project,entity_id.in.(${projectIds.join(',')}))`,
      );
    } else {
      // Only client-related activity
      query = query.eq('entity_type', 'client').eq('entity_id', clientId);
    }

    const { data, error } = await query;
    if (error) return { data: null, error: error.message };
    return { data: (data ?? []) as unknown as ActivityLogWithUser[], error: null };
  } catch {
    return { data: null, error: 'Failed to fetch activity' };
  }
}
