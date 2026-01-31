import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get time period from query params
    const period = request.nextUrl.searchParams.get('period') || 'all';
    const platform = request.nextUrl.searchParams.get('platform') || 'all'; // 'all' | 'x' | 'linkedin'

    // Calculate date filter
    let dateFilter: Date | null = null;
    if (period === '7d') {
      dateFilter = new Date();
      dateFilter.setDate(dateFilter.getDate() - 7);
    } else if (period === '30d') {
      dateFilter = new Date();
      dateFilter.setDate(dateFilter.getDate() - 30);
    }

    // Build query
    let query = supabase
      .from('social_posts')
      .select('id, channel, external_id, created_at');

    if (platform !== 'all') {
      query = query.eq('channel', platform);
    }

    if (dateFilter) {
      query = query.gte('created_at', dateFilter.toISOString());
    }

    const { data: posts, error } = await query;

    if (error) {
      console.error('Error fetching posts:', error);
      return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
    }

    // Separate posts by platform
    const xPosts = posts?.filter(p => p.channel === 'x' && p.external_id) || [];
    const linkedinPosts = posts?.filter(p => p.channel === 'linkedin' && p.external_id) || [];

    // Fetch metrics for X posts
    let xMetrics: Record<string, any> = {};
    if (xPosts.length > 0) {
      try {
        const xIds = xPosts.map(p => p.external_id).join(',');
        const xResponse = await fetch(`${request.nextUrl.origin}/api/post/x/metrics?ids=${xIds}`, {
          headers: { Cookie: request.headers.get('cookie') || '' },
        });
        if (xResponse.ok) {
          const data = await xResponse.json();
          xMetrics = data.metrics || {};
        }
      } catch (e) {
        console.error('Error fetching X metrics:', e);
      }
    }

    // Fetch metrics for LinkedIn posts
    let linkedinMetrics: Record<string, any> = {};
    if (linkedinPosts.length > 0) {
      try {
        const linkedinIds = linkedinPosts.map(p => p.external_id).join(',');
        const linkedinResponse = await fetch(`${request.nextUrl.origin}/api/post/linkedin/metrics?ids=${linkedinIds}`, {
          headers: { Cookie: request.headers.get('cookie') || '' },
        });
        if (linkedinResponse.ok) {
          const data = await linkedinResponse.json();
          linkedinMetrics = data.metrics || {};
        }
      } catch (e) {
        console.error('Error fetching LinkedIn metrics:', e);
      }
    }

    // Aggregate X metrics
    let xTotals = {
      posts: xPosts.length,
      impressions: 0,
      likes: 0,
      comments: 0,
      shares: 0,
    };
    for (const post of xPosts) {
      const m = xMetrics[post.external_id];
      if (m) {
        xTotals.impressions += m.impressions || 0;
        xTotals.likes += m.likes || 0;
        xTotals.comments += m.replies || 0;
        xTotals.shares += (m.retweets || 0) + (m.quotes || 0);
      }
    }

    // Aggregate LinkedIn metrics
    let linkedinTotals = {
      posts: linkedinPosts.length,
      impressions: 0,
      likes: 0,
      comments: 0,
      shares: 0,
    };
    for (const post of linkedinPosts) {
      const m = linkedinMetrics[post.external_id];
      if (m) {
        linkedinTotals.impressions += m.impressions || 0;
        linkedinTotals.likes += m.likes || 0;
        linkedinTotals.comments += m.comments || 0;
        linkedinTotals.shares += m.shares || 0;
      }
    }

    // Combined totals
    const combined = {
      posts: xTotals.posts + linkedinTotals.posts,
      impressions: xTotals.impressions + linkedinTotals.impressions,
      likes: xTotals.likes + linkedinTotals.likes,
      comments: xTotals.comments + linkedinTotals.comments,
      shares: xTotals.shares + linkedinTotals.shares,
      engagement: (xTotals.likes + xTotals.comments + xTotals.shares) +
                  (linkedinTotals.likes + linkedinTotals.comments + linkedinTotals.shares),
    };

    // Calculate engagement rate
    const engagementRate = combined.impressions > 0
      ? ((combined.engagement / combined.impressions) * 100).toFixed(2)
      : '0.00';

    return NextResponse.json({
      period,
      platform,
      combined: {
        ...combined,
        engagementRate: parseFloat(engagementRate),
      },
      x: xTotals,
      linkedin: linkedinTotals,
    });
  } catch (error: any) {
    console.error('Error in analytics summary:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
