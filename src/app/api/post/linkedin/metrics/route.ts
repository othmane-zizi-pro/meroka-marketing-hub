import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get post IDs from query params (these are LinkedIn share URNs)
    const postIds = request.nextUrl.searchParams.get('ids');
    if (!postIds) {
      return NextResponse.json(
        { error: 'Post IDs required' },
        { status: 400 }
      );
    }

    const ids = postIds.split(',').filter(id => id.trim());
    if (ids.length === 0) {
      return NextResponse.json({ metrics: {} });
    }

    // Get shared admin LinkedIn connection
    const { data: connection, error: connectionError } = await supabase
      .from('linkedin_connections')
      .select('access_token, organization_id')
      .eq('user_email', 'shared_admin')
      .single();

    if (connectionError || !connection || !connection.organization_id) {
      return NextResponse.json(
        { error: 'LinkedIn not connected' },
        { status: 400 }
      );
    }

    // Build the shares list for the API query
    // Format: List(urn:li:share:123,urn:li:share:456)
    const sharesList = `List(${ids.join(',')})`;
    const orgUrn = `urn:li:organization:${connection.organization_id}`;

    // Fetch share statistics from LinkedIn
    const statsUrl = new URL('https://api.linkedin.com/rest/organizationalEntityShareStatistics');
    statsUrl.searchParams.set('q', 'organizationalEntity');
    statsUrl.searchParams.set('organizationalEntity', orgUrn);
    statsUrl.searchParams.set('shares', sharesList);

    console.log('LinkedIn metrics request:', {
      url: statsUrl.toString(),
      orgUrn,
      sharesList,
      ids,
    });

    const statsResponse = await fetch(statsUrl.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${connection.access_token}`,
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202601',
      },
    });

    const responseText = await statsResponse.text();
    console.log('LinkedIn metrics response:', statsResponse.status, responseText);

    if (!statsResponse.ok) {
      return NextResponse.json(
        { error: `LinkedIn API error (${statsResponse.status}): ${responseText.substring(0, 200)}` },
        { status: 500 }
      );
    }

    const statsData = JSON.parse(responseText);

    // Build metrics map
    const metrics: Record<string, {
      impressions: number;
      uniqueImpressions: number;
      clicks: number;
      likes: number;
      comments: number;
      shares: number;
      engagement: number;
    }> = {};

    if (statsData.elements) {
      for (const element of statsData.elements) {
        const shareUrn = element.share;
        if (shareUrn && element.totalShareStatistics) {
          const stats = element.totalShareStatistics;
          metrics[shareUrn] = {
            impressions: stats.impressionCount || 0,
            uniqueImpressions: stats.uniqueImpressionsCount || 0,
            clicks: stats.clickCount || 0,
            likes: stats.likeCount || 0,
            comments: stats.commentCount || 0,
            shares: stats.shareCount || 0,
            engagement: stats.engagement || 0,
          };
        }
      }
    }

    return NextResponse.json({
      metrics,
      debug: {
        requestedIds: ids,
        apiResponse: statsData,
      }
    });
  } catch (error: any) {
    console.error('Error fetching LinkedIn metrics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
