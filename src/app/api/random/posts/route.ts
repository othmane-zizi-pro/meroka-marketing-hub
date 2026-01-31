import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/random/posts - List random campaign posts
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const channel = searchParams.get('channel'); // 'linkedin' | 'x'
    const status = searchParams.get('status'); // 'pending_review' | 'approved' | etc.

    // Get random campaigns
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('id')
      .eq('type', 'random')
      .eq('is_active', true);

    if (campaignsError) {
      console.error('Error fetching random campaigns:', campaignsError);
      return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
    }

    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json({ posts: [] });
    }

    const campaignIds = campaigns.map(c => c.id);

    // Build query for random campaign posts
    let query = supabase
      .from('post_drafts')
      .select(`
        *,
        inspiration:social_posts!inspiration_post_id (
          id,
          content,
          external_url,
          author_name,
          channel
        )
      `)
      .in('campaign_id', campaignIds)
      .order('created_at', { ascending: false });

    if (channel) {
      query = query.eq('channel', channel);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: posts, error: postsError } = await query;

    if (postsError) {
      console.error('Error fetching random posts:', postsError);
      return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
    }

    // For each post, fetch its edit history
    const postsWithHistory = await Promise.all(
      (posts || []).map(async (post) => {
        const { data: editHistory } = await supabase
          .from('post_edit_history')
          .select('*')
          .eq('post_draft_id', post.id)
          .order('created_at', { ascending: false });

        return {
          ...post,
          edit_history: editHistory || [],
        };
      })
    );

    return NextResponse.json({ posts: postsWithHistory });
  } catch (error) {
    console.error('Error in GET /api/random/posts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
