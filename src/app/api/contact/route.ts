import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';

const contactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  subject: z.string().optional(),
  message: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = contactSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const { name, email, phone, subject, message } = parsed.data;

  try {
    const supabase = createAdminClient();

    const notesParts: string[] = [];
    notesParts.push(`Source: Landing page contact form`);
    if (subject) notesParts.push(`Subject: ${subject}`);
    notesParts.push(`Message: ${message}`);

    const { error } = await supabase.from('leads').insert({
      contact_name: name,
      email,
      phone: phone || null,
      source: 'website' as const,
      stage: 'new' as const,
      notes: notesParts.join('\n'),
    });

    if (error) {
      console.error('Failed to create lead:', error);
      return NextResponse.json({ error: 'Failed to submit' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Contact form error:', err);
    return NextResponse.json({ error: 'Failed to submit' }, { status: 500 });
  }
}
