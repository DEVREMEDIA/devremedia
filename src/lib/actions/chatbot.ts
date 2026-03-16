'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createKnowledgeSchema, updateKnowledgeSchema } from '@/lib/schemas/chatbot';
import { getEmbedding } from '@/lib/chatbot/embeddings';
import type { ActionResult, ChatKnowledge } from '@/types/index';
import { revalidatePath } from 'next/cache';

export async function createKnowledgeEntry(input: unknown): Promise<ActionResult<ChatKnowledge>> {
  try {
    const validated = createKnowledgeSchema.parse(input);
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
      return { data: null, error: 'Forbidden: admin access required' };
    }

    // Generate embedding
    const textToEmbed = `${validated.title}. ${validated.content_en || validated.content}`;
    const embedding = await getEmbedding(textToEmbed);

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('chat_knowledge')
      .insert({
        ...validated,
        embedding: JSON.stringify(embedding),
      })
      .select(
        'id, category, title, content, content_en, content_el, metadata, embedding, created_at, updated_at',
      )
      .single();

    if (error) return { data: null, error: error.message };
    revalidatePath('/admin/chatbot/knowledge');
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to create' };
  }
}

export async function updateKnowledgeEntry(
  id: string,
  input: unknown,
): Promise<ActionResult<ChatKnowledge>> {
  try {
    const validated = updateKnowledgeSchema.parse(input);
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
      return { data: null, error: 'Forbidden: admin access required' };
    }

    const admin = createAdminClient();

    // Re-embed if content changed
    let embedding;
    if (validated.title || validated.content || validated.content_en) {
      const { data: existing } = await admin
        .from('chat_knowledge')
        .select('title, content, content_en')
        .eq('id', id)
        .single();

      const title = validated.title || existing?.title || '';
      const contentEn =
        validated.content_en ||
        existing?.content_en ||
        validated.content ||
        existing?.content ||
        '';
      const textToEmbed = `${title}. ${contentEn}`;
      embedding = await getEmbedding(textToEmbed);
    }

    const updateData = embedding
      ? { ...validated, embedding: JSON.stringify(embedding) }
      : validated;

    const { data, error } = await admin
      .from('chat_knowledge')
      .update(updateData)
      .eq('id', id)
      .select(
        'id, category, title, content, content_en, content_el, metadata, embedding, created_at, updated_at',
      )
      .single();

    if (error) return { data: null, error: error.message };
    revalidatePath('/admin/chatbot/knowledge');
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to update' };
  }
}

export async function deleteKnowledgeEntry(id: string): Promise<ActionResult<null>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
      return { data: null, error: 'Forbidden: admin access required' };
    }

    const admin = createAdminClient();
    const { error } = await admin.from('chat_knowledge').delete().eq('id', id);

    if (error) return { data: null, error: error.message };
    revalidatePath('/admin/chatbot/knowledge');
    return { data: null, error: null };
  } catch {
    return { data: null, error: 'Failed to delete' };
  }
}

export async function deleteChatConversation(id: string): Promise<ActionResult<null>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
      return { data: null, error: 'Forbidden: admin access required' };
    }

    const admin = createAdminClient();
    const { error } = await admin.from('chat_conversations').delete().eq('id', id);

    if (error) return { data: null, error: error.message };
    revalidatePath('/admin/chatbot');
    return { data: null, error: null };
  } catch {
    return { data: null, error: 'Failed to delete conversation' };
  }
}
