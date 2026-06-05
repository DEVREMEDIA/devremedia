import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Durable, serverless-safe fixed-window rate limiter backed by `auth_rate_limits`.
 * Returns true if the action is allowed (and records it), false if `key` is over `max`
 * within `windowMs`. Mirrors the chatbot limiter (src/lib/chatbot/rate-limiter.ts).
 *
 * Used to gate public auth endpoints before any expensive work, so the cost can't be
 * amplified and response timing doesn't correlate with account state.
 */
export async function checkRateLimit(key: string, max: number, windowMs: number): Promise<boolean> {
  const supabase = createAdminClient();
  const now = Date.now();

  const { data } = await supabase
    .from('auth_rate_limits')
    .select('count, window_start')
    .eq('key', key)
    .maybeSingle();

  if (!data) {
    // First hit in this window — upsert guards against a concurrent first insert.
    await supabase
      .from('auth_rate_limits')
      .upsert({ key, count: 1, window_start: new Date(now).toISOString() });
    return true;
  }

  const elapsed = now - new Date(data.window_start).getTime();
  if (elapsed > windowMs) {
    await supabase
      .from('auth_rate_limits')
      .update({ count: 1, window_start: new Date(now).toISOString() })
      .eq('key', key);
    return true;
  }

  if (data.count >= max) {
    return false;
  }

  await supabase
    .from('auth_rate_limits')
    .update({ count: data.count + 1 })
    .eq('key', key);
  return true;
}
