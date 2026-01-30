import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/drafts/[id] - Get a single draft with edit history
export async function GET(
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

    // Get draft
    const { data: draft, error: draftError } = await supabase
      .from('post_drafts')
      .select('*')
      .eq('id', id)
      .single();

    if (draftError || !draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    // Get edit history
    const { data: editHistory, error: historyError } = await supabase
      .from('post_edit_history')
      .select('*')
      .eq('post_draft_id', id)
      .order('created_at', { ascending: false });

    if (historyError) {
      console.error('Error fetching edit history:', historyError);
    }

    return NextResponse.json({ draft, editHistory: editHistory || [] });
  } catch (error) {
    console.error('Error in GET /api/drafts/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/drafts/[id] - Update a draft (edit content, reschedule, etc.)
export async function PATCH(
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

    // Get user's internal info
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('email', user.email)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
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

    // Can't edit published or rejected posts (but failed can be retried)
    if (['published', 'rejected'].includes(currentDraft.status)) {
      return NextResponse.json({ error: 'Cannot edit published or rejected posts' }, { status: 400 });
    }

    const body = await request.json();
    const { content, scheduledFor, scheduledTimezone, editSummary } = body;

    const updates: Record<string, any> = {};

    // If rescheduling a failed post, reset status to scheduled
    if (currentDraft.status === 'failed' && scheduledFor !== undefined) {
      updates.status = 'scheduled';
      updates.rejection_reason = null;
    }

    // Handle content update (proofreading edit)
    if (content !== undefined && content.trim() !== (currentDraft.current_content || currentDraft.content)) {
      const previousContent = currentDraft.current_content || currentDraft.content;

      // Record edit in history
      await supabase.from('post_edit_history').insert({
        post_draft_id: id,
        editor_id: userData.id,
        editor_email: userData.email,
        editor_name: userData.name || userData.email.split('@')[0],
        previous_content: previousContent,
        new_content: content.trim(),
        edit_summary: editSummary || null,
      });

      updates.current_content = content.trim();
      updates.last_edited_by = userData.id;
      updates.last_edited_at = new Date().toISOString();
    }

    // Handle schedule update
    if (scheduledFor !== undefined) {
      updates.scheduled_for = scheduledFor;
    }

    if (scheduledTimezone !== undefined) {
      updates.scheduled_timezone = scheduledTimezone;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No changes to apply' }, { status: 400 });
    }

    const { data: draft, error: updateError } = await supabase
      .from('post_drafts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating draft:', updateError);
      return NextResponse.json({ error: 'Failed to update draft' }, { status: 500 });
    }

    return NextResponse.json({ draft });
  } catch (error) {
    console.error('Error in PATCH /api/drafts/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/drafts/[id] - Delete a draft (author only)
export async function DELETE(
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
      .select('author_email, status')
      .eq('id', id)
      .single();

    if (fetchError || !currentDraft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    // Only author can delete
    if (currentDraft.author_email.toLowerCase() !== user.email?.toLowerCase()) {
      return NextResponse.json({ error: 'Only the author can delete this draft' }, { status: 403 });
    }

    // Can't delete published posts
    if (currentDraft.status === 'published') {
      return NextResponse.json({ error: 'Cannot delete published posts' }, { status: 400 });
    }

    const { error: deleteError } = await supabase
      .from('post_drafts')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting draft:', deleteError);
      return NextResponse.json({ error: 'Failed to delete draft' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/drafts/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
