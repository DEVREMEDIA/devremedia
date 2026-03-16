'use server';

import { createClient } from '@/lib/supabase/server';
import { createLeadActivitySchema } from '@/lib/schemas/lead-activity';
import type { ActionResult, LeadActivity } from '@/types';
import { revalidatePath } from 'next/cache';

export async function getLeadActivities(leadId: string): Promise<ActionResult<LeadActivity[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };
    const { data, error } = await supabase
      .from('lead_activities')
      .select(
        'id, lead_id, user_id, activity_type, title, description, metadata, created_at, user:user_profiles(display_name)',
      )
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data: data ?? [], error: null };
  } catch {
    return { data: null, error: 'Failed to fetch lead activities' };
  }
}

export async function createLeadActivity(input: unknown): Promise<ActionResult<LeadActivity>> {
  try {
    const validated = createLeadActivitySchema.parse(input);
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };

    const { data, error } = await supabase
      .from('lead_activities')
      .insert({
        ...validated,
        user_id: user.id,
      })
      .select('id, lead_id, user_id, activity_type, title, description, metadata, created_at')
      .single();

    if (error) return { data: null, error: error.message };

    // Update last_contacted_at on the lead for contact-type activities
    if (['call', 'email', 'meeting'].includes(validated.activity_type)) {
      await supabase
        .from('leads')
        .update({ last_contacted_at: new Date().toISOString() })
        .eq('id', validated.lead_id);
    }

    revalidatePath(`/salesman/leads/${validated.lead_id}`);
    revalidatePath(`/admin/leads/${validated.lead_id}`);
    return { data, error: null };
  } catch (error) {
    if (error instanceof Error) return { data: null, error: error.message };
    return { data: null, error: 'Failed to create lead activity' };
  }
}
