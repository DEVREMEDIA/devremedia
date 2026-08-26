import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { NOTIFICATION_TYPES } from '@/lib/notification-types';
import { createNotificationForMany, getAdminUserIds } from '@/lib/actions/notifications';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const PDF_MAGIC_BYTES = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ contractId: string }> },
) {
  try {
    // 1. Auth check
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contractId } = await params;

    // 2. Get contract and verify ownership
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('id, status, client_id, clients!inner(user_id)')
      .eq('id', contractId)
      .single();

    if (contractError || !contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    // Ownership check
    const clientData = contract.clients as unknown as { user_id: string | null };
    if (!clientData?.user_id || clientData.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Status guard
    if (!['sent', 'viewed'].includes(contract.status)) {
      return NextResponse.json(
        { error: 'Contract cannot accept uploads in current status' },
        { status: 400 },
      );
    }

    // 4. Read and validate file
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are accepted' }, { status: 400 });
    }

    // Magic bytes check
    const buffer = await file.arrayBuffer();
    const header = new Uint8Array(buffer.slice(0, 5));
    const isPdf = PDF_MAGIC_BYTES.every((byte, i) => header[i] === byte);
    if (!isPdf) {
      return NextResponse.json({ error: 'Invalid PDF file' }, { status: 400 });
    }

    // 5. Upload to Supabase Storage
    const storagePath = `signed/${contractId}/signed-contract.pdf`;

    const { error: uploadError } = await supabase.storage
      .from('contracts')
      .upload(storagePath, buffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('Contract upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    // 6. Update contract status
    const { error: updateError } = await supabase
      .from('contracts')
      .update({
        signed_pdf_path: storagePath,
        status: 'pending_review',
      })
      .eq('id', contractId);

    if (updateError) {
      console.error('Contract update error:', updateError);
      return NextResponse.json({ error: 'Failed to update contract' }, { status: 500 });
    }

    // 7. Notify admins
    const adminIds = await getAdminUserIds();
    if (adminIds.length > 0) {
      await createNotificationForMany(adminIds, {
        type: NOTIFICATION_TYPES.CONTRACT_PENDING_REVIEW,
        title: 'Signed contract uploaded',
        actionUrl: `/admin/contracts/${contractId}`,
      });
    }

    revalidatePath('/admin/clients');
    revalidatePath(`/admin/contracts/${contractId}`);
    revalidatePath('/client/documents');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Contract upload-signed error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
