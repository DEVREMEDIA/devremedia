import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { signContractSchema } from '@/lib/schemas/contract';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ contractId: string }> },
) {
  try {
    const { contractId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = signContractSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400 },
      );
    }

    // Fetch contract to verify it exists and is in signable state
    const { data: contract, error: fetchError } = await supabase
      .from('contracts')
      .select('id, status, client_id, clients!inner(user_id)')
      .eq('id', contractId)
      .single();

    if (fetchError || !contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    // Verify the authenticated user is the client who owns this contract
    const clientData = contract.clients as unknown as { user_id: string | null };
    if (!clientData?.user_id || clientData.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden: not your contract' }, { status: 403 });
    }

    if (contract.status === 'signed') {
      return NextResponse.json({ error: 'Contract is already signed' }, { status: 400 });
    }

    if (contract.status !== 'sent' && contract.status !== 'viewed') {
      return NextResponse.json(
        { error: 'Contract must be sent before it can be signed' },
        { status: 400 },
      );
    }

    // Update contract with signature
    const { data: updated, error: updateError } = await supabase
      .from('contracts')
      .update({
        status: 'signed',
        signature_data: {
          signature_image: parsed.data.signature_image,
          signed_at: new Date().toISOString(),
        },
        signed_at: new Date().toISOString(),
      })
      .eq('id', contractId)
      .select()
      .single();

    if (updateError) {
      console.error('Contract sign error:', updateError);
      return NextResponse.json({ error: 'Failed to sign contract' }, { status: 500 });
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('Contract sign error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
