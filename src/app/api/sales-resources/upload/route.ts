import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check admin role
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const categoryId = formData.get('category_id') as string | null;

  if (!file || !categoryId) {
    return NextResponse.json({ error: 'File and category_id required' }, { status: 400 });
  }

  // Sanitize filename
  const ext = file.name.split('.').pop() ?? '';
  const safeName = file.name
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 100);
  const timestamp = Date.now();
  const filePath = `${categoryId}/${timestamp}_${safeName}.${ext}`;

  // Upload using admin client to bypass storage RLS
  const adminSupabase = createAdminClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { data: uploadData, error: uploadError } = await adminSupabase.storage
    .from('sales-resources')
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  return NextResponse.json({
    path: uploadData.path,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
  });
}
