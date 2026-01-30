import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/drafts/[id]/approve - Approve a draft (author only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current draft
    const { data: currentDraft, error: fetchError } = await supabase
      .from('post_drafts')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !currentDraft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    // Only author can approve
    if (currentDraft.author_email.toLowerCase() !== user.email?.toLowerCase()) {
      return NextResponse.json({ error: 'Only the original author can approve this post' }, { status: 403 });
    }

    // Can only approve pending_review posts
    if (currentDraft.status !== 'pending_review') {
      return NextResponse.json({ error: 'Can only approve posts pending review' }, { status: 400 });
    }

    const { data: draft, error: updateError } = await supabase
      .from('post_drafts')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error approving draft:', updateError);
      return NextResponse.json({ error: 'Failed to approve draft' }, { status: 500 });
    }

    return NextResponse.json({ draft });
  } catch (error) {
    console.error('Error in POST /api/drafts/[id]/approve:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
