import { streamText, type UIMessage } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createAdminClient } from '@/lib/supabase/admin';
import { getEmbedding } from '@/lib/chatbot/embeddings';
import { checkRateLimit } from '@/lib/chatbot/rate-limiter';
import { buildSystemPrompt } from '@/lib/chatbot/system-prompt';

export const maxDuration = 30;

/** Extract text content from a UIMessage's parts array */
function extractText(msg: UIMessage): string {
  if (!msg.parts) return '';
  return msg.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('');
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, sessionId, language = 'en', pageUrl } = body;

    if (!messages || !sessionId) {
      return new Response('Missing required fields', { status: 400 });
    }

    // Rate limit check — use IP + sessionId to prevent easy bypass
    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';
    const rateLimitKey = `${clientIp}:${sessionId}`;
    const rateCheck = await checkRateLimit(rateLimitKey);
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({
          error:
            language === 'el'
              ? 'Πολλά μηνύματα. Παρακαλώ περιμένετε λίγο.'
              : 'Too many messages. Please wait a moment.',
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createAdminClient();

    // Get or create conversation
    let conversationId: string;
    const { data: existingConv } = await supabase
      .from('chat_conversations')
      .select('id')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingConv) {
      conversationId = existingConv.id;
    } else {
      const { data: newConv } = await supabase
        .from('chat_conversations')
        .insert({
          session_id: sessionId,
          language,
          page_url: pageUrl || null,
          user_agent: req.headers.get('user-agent') || null,
        })
        .select('id')
        .single();
      conversationId = newConv!.id;
    }

    // Get the latest user message for RAG
    const typedMessages = messages as UIMessage[];
    const lastUserMessage = [...typedMessages].reverse().find((m) => m.role === 'user');
    let contextContent = '';

    if (lastUserMessage) {
      const userContent = extractText(lastUserMessage);

      // Store user message
      if (userContent) {
        await supabase.from('chat_messages').insert({
          conversation_id: conversationId,
          role: 'user',
          content: userContent,
        });

        // Embed the query and search knowledge base
        try {
          const queryEmbedding = await getEmbedding(userContent);
          const { data: chunks } = await supabase.rpc('match_knowledge', {
            query_embedding: JSON.stringify(queryEmbedding),
            match_threshold: 0.3,
            match_count: 5,
          });

          if (chunks && chunks.length > 0) {
            const lang = language === 'el' ? 'content_el' : 'content_en';
            contextContent = chunks
              .map((c: Record<string, unknown>) => `[${c.title}]: ${c[lang] || c.content_en || ''}`)
              .join('\n\n');
          }
        } catch (embeddingError) {
          console.error('Embedding/RAG error:', embeddingError);
        }
      }
    }

    // Build system prompt with context
    const systemPrompt = buildSystemPrompt(language as 'en' | 'el', contextContent);

    // Convert UIMessage parts to simple role/content for the model
    const recentMessages = typedMessages.slice(-10).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: extractText(m),
    }));

    // Stream response
    const result = streamText({
      model: openai('gpt-4.1-mini'),
      system: systemPrompt,
      messages: recentMessages,
      maxOutputTokens: 500,
      temperature: 0.7,
      onFinish: async ({ text }) => {
        // Store assistant response
        await supabase.from('chat_messages').insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: text,
        });

        // Update conversation message count
        const { data: conv } = await supabase
          .from('chat_conversations')
          .select('message_count')
          .eq('id', conversationId)
          .single();

        if (conv) {
          await supabase
            .from('chat_conversations')
            .update({ message_count: conv.message_count + 2 })
            .eq('id', conversationId);
        }
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
