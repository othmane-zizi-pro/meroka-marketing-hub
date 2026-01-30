import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's internal ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { campaignId, content } = body;

    if (!campaignId || !content?.trim()) {
      return NextResponse.json(
        { error: 'Campaign ID and content are required' },
        { status: 400 }
      );
    }

    // Verify campaign exists and is active
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, name')
      .eq('id', campaignId)
      .eq('is_active', true)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Create the post
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        campaign_id: campaignId,
        author_id: userData.id,
        content: content.trim(),
        source_type: 'employee_composed',
        status: 'pending_review',
      })
      .select()
      .single();

    if (postError) {
      console.error('Error creating post:', postError);
      return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
    }

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/campaign/posts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
