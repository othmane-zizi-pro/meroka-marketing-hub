import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    const body = await request.json();
    const { scheduledFor, timezone = 'America/New_York' } = body;

    if (!scheduledFor) {
      return NextResponse.json({ error: 'Scheduled time is required' }, { status: 400 });
    }

    // Get the draft
    const { data: draft, error: fetchError } = await supabase
      .from('post_drafts')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    // Update to scheduled
    const { data: updatedDraft, error: updateError } = await supabase
      .from('post_drafts')
      .update({
        route: 'scheduled',
        status: 'scheduled',
        scheduled_for: scheduledFor,
        scheduled_timezone: timezone,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error scheduling draft:', updateError);
      return NextResponse.json({ error: 'Failed to schedule' }, { status: 500 });
    }

    return NextResponse.json({
      draft: updatedDraft,
      message: 'Scheduled successfully',
    });
  } catch (error) {
    console.error('Error in POST /api/drafts/[id]/schedule:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
