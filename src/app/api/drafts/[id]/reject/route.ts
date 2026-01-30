import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/drafts/[id]/reject - Reject a draft (author only)
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

    // Only author can reject
    if (currentDraft.author_email.toLowerCase() !== user.email?.toLowerCase()) {
      return NextResponse.json({ error: 'Only the original author can reject this post' }, { status: 403 });
    }

    // Can only reject pending_review posts
    if (currentDraft.status !== 'pending_review') {
      return NextResponse.json({ error: 'Can only reject posts pending review' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { reason } = body;

    const { data: draft, error: updateError } = await supabase
      .from('post_drafts')
      .update({
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        rejection_reason: reason || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error rejecting draft:', updateError);
      return NextResponse.json({ error: 'Failed to reject draft' }, { status: 500 });
    }

    return NextResponse.json({ draft });
  } catch (error) {
    console.error('Error in POST /api/drafts/[id]/reject:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
