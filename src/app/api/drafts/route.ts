import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/drafts - List drafts with optional filters
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const route = searchParams.get('route'); // 'proofreading' | 'scheduled' | 'all'
    const status = searchParams.get('status');
    const channel = searchParams.get('channel');

    let query = supabase
      .from('post_drafts')
      .select('*')
      .order('created_at', { ascending: false });

    if (route && route !== 'all') {
      query = query.eq('route', route);
    }

    // Exclude AI-generated posts from proofreading room
    // AI posts have campaign_id set, user-sent posts have campaign_id null
    if (route === 'proofreading') {
      query = query.is('campaign_id', null);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (channel) {
      query = query.eq('channel', channel);
    }

    const { data: drafts, error } = await query;

    if (error) {
      console.error('Error fetching drafts:', error);
      return NextResponse.json({ error: 'Failed to fetch drafts' }, { status: 500 });
    }

    return NextResponse.json({ drafts });
  } catch (error) {
    console.error('Error in GET /api/drafts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/drafts - Create a new draft
export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json();
    const {
      content,
      channel,
      mediaUrl,
      mediaType,
      route = 'direct',
      scheduledFor,
      scheduledTimezone = 'America/New_York',
      actionType = 'post',
      targetPostUrn,
    } = body;

    if (!channel) {
      return NextResponse.json({ error: 'Channel is required' }, { status: 400 });
    }

    // Validate based on action type
    const needsContent = !['like', 'repost'].includes(actionType);
    const needsTarget = ['repost', 'comment', 'like'].includes(actionType);

    if (needsContent && !content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    if (needsTarget && !targetPostUrn) {
      return NextResponse.json({ error: 'Target post URL is required for this action' }, { status: 400 });
    }

    if (!['direct', 'proofreading', 'scheduled'].includes(route)) {
      return NextResponse.json({ error: 'Invalid route' }, { status: 400 });
    }

    if (route === 'scheduled' && !scheduledFor) {
      return NextResponse.json({ error: 'Scheduled time is required for scheduled posts' }, { status: 400 });
    }

    // Determine initial status based on route
    let status: string;
    if (route === 'direct') {
      status = 'approved'; // Will be published immediately
    } else if (route === 'proofreading') {
      status = 'pending_review';
    } else {
      status = 'scheduled';
    }

    const { data: draft, error: insertError } = await supabase
      .from('post_drafts')
      .insert({
        content: content?.trim() || '',
        channel,
        media_url: mediaUrl || null,
        media_type: mediaType || null,
        author_id: userData.id,
        author_email: userData.email,
        author_name: userData.name || userData.email.split('@')[0],
        route,
        status,
        scheduled_for: route === 'scheduled' ? scheduledFor : null,
        scheduled_timezone: route === 'scheduled' ? scheduledTimezone : null,
        action_type: actionType,
        target_post_urn: targetPostUrn || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating draft:', insertError);
      return NextResponse.json({ error: 'Failed to create draft' }, { status: 500 });
    }

    return NextResponse.json({ draft }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/drafts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
