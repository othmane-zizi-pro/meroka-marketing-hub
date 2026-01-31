import { NextRequest, NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const results: {
      x: { followers: number; username: string } | null;
      linkedin: { followers: number; organizationName: string } | null;
      combined: number;
    } = {
      x: null,
      linkedin: null,
      combined: 0,
    };

    // Fetch X (Twitter) followers
    try {
      const apiKey = process.env.X_API_KEY;
      const apiSecret = process.env.X_API_SECRET;
      const accessToken = process.env.X_ACCESS_TOKEN;
      const accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET;

      if (apiKey && apiSecret && accessToken && accessTokenSecret) {
        const client = new TwitterApi({
          appKey: apiKey,
          appSecret: apiSecret,
          accessToken: accessToken,
          accessSecret: accessTokenSecret,
        });

        // Get authenticated user with follower count
        const me = await client.v2.me({
          'user.fields': ['public_metrics', 'username', 'name'],
        });

        if (me.data && me.data.public_metrics) {
          results.x = {
            followers: me.data.public_metrics.followers_count || 0,
            username: me.data.username || 'Unknown',
          };
          results.combined += results.x.followers;
        }
      }
    } catch (e: any) {
      console.error('Error fetching X followers:', e.message);
    }

    // Fetch LinkedIn followers
    try {
      const { data: connection } = await supabase
        .from('linkedin_connections')
        .select('access_token, organization_id, organization_name')
        .eq('user_email', 'shared_admin')
        .single();

      if (connection && connection.organization_id) {
        const orgUrn = `urn:li:organization:${connection.organization_id}`;
        const encodedOrg = encodeURIComponent(orgUrn);

        // Fetch follower statistics
        const followerUrl = `https://api.linkedin.com/rest/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=${encodedOrg}`;

        const response = await fetch(followerUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
            'X-Restli-Protocol-Version': '2.0.0',
            'LinkedIn-Version': '202601',
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.elements && data.elements.length > 0) {
            const followerStats = data.elements[0];
            // Total followers is in followerCounts.organicFollowerCount + paidFollowerCount
            const organicFollowers = followerStats.followerCounts?.organicFollowerCount || 0;
            const paidFollowers = followerStats.followerCounts?.paidFollowerCount || 0;
            const totalFollowers = organicFollowers + paidFollowers;

            results.linkedin = {
              followers: totalFollowers,
              organizationName: connection.organization_name || 'Organization',
            };
            results.combined += results.linkedin.followers;
          }
        } else {
          const errorText = await response.text();
          console.error('LinkedIn follower API error:', response.status, errorText);
        }
      }
    } catch (e: any) {
      console.error('Error fetching LinkedIn followers:', e.message);
    }

    return NextResponse.json(results);
  } catch (error: any) {
    console.error('Error in followers endpoint:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
