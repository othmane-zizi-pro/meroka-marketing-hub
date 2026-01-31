import { NextRequest, NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';
import { createClient } from '@supabase/supabase-js';

// POST - Create a snapshot of current follower counts
// Can be called manually or via cron job
export async function POST(request: NextRequest) {
  try {
    // Verify auth - either user session or cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Use service role for database operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const today = new Date().toISOString().split('T')[0];
    const results: { x?: number; linkedin?: number; errors: string[] } = { errors: [] };

    // Fetch and save X followers
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

        const me = await client.v2.me({
          'user.fields': ['public_metrics', 'username'],
        });

        if (me.data?.public_metrics?.followers_count !== undefined) {
          const followerCount = me.data.public_metrics.followers_count;

          // Upsert snapshot for today
          const { error } = await supabase
            .from('follower_snapshots')
            .upsert({
              platform: 'x',
              follower_count: followerCount,
              snapshot_date: today,
              recorded_at: new Date().toISOString(),
              metadata: { username: me.data.username },
            }, {
              onConflict: 'platform,snapshot_date',
            });

          if (error) {
            console.error('Error saving X snapshot:', error);
            results.errors.push(`X: ${error.message}`);
          } else {
            results.x = followerCount;
          }
        }
      }
    } catch (e: any) {
      console.error('Error fetching X followers for snapshot:', e.message);
      results.errors.push(`X: ${e.message}`);
    }

    // Fetch and save LinkedIn followers
    try {
      const { data: connection } = await supabase
        .from('linkedin_connections')
        .select('access_token, organization_id, organization_name')
        .eq('user_email', 'shared_admin')
        .single();

      if (connection?.organization_id) {
        const orgUrn = `urn:li:organization:${connection.organization_id}`;
        let followerCount = 0;

        // Try networkSizes API first
        try {
          const networkSizesUrl = `https://api.linkedin.com/v2/networkSizes/${orgUrn}?edgeType=CompanyFollowedByMember`;
          const networkResponse = await fetch(networkSizesUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${connection.access_token}`,
              'X-Restli-Protocol-Version': '2.0.0',
            },
          });

          if (networkResponse.ok) {
            const networkData = await networkResponse.json();
            followerCount = networkData.firstDegreeSize || 0;
          }
        } catch (e) {
          // Fallback to followerStatistics
        }

        // Try REST API fallback
        if (followerCount === 0) {
          const encodedOrg = encodeURIComponent(orgUrn);
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
            if (data.elements?.[0]?.followerCounts) {
              const stats = data.elements[0].followerCounts;
              followerCount = (stats.organicFollowerCount || 0) + (stats.paidFollowerCount || 0);
            }
          }
        }

        // Save snapshot even if 0 (we want to track the attempt)
        const { error } = await supabase
          .from('follower_snapshots')
          .upsert({
            platform: 'linkedin',
            follower_count: followerCount,
            snapshot_date: today,
            recorded_at: new Date().toISOString(),
            metadata: { organizationName: connection.organization_name },
          }, {
            onConflict: 'platform,snapshot_date',
          });

        if (error) {
          console.error('Error saving LinkedIn snapshot:', error);
          results.errors.push(`LinkedIn: ${error.message}`);
        } else {
          results.linkedin = followerCount;
        }
      }
    } catch (e: any) {
      console.error('Error fetching LinkedIn followers for snapshot:', e.message);
      results.errors.push(`LinkedIn: ${e.message}`);
    }

    return NextResponse.json({
      success: results.errors.length === 0,
      date: today,
      snapshots: {
        x: results.x,
        linkedin: results.linkedin,
      },
      errors: results.errors.length > 0 ? results.errors : undefined,
    });
  } catch (error: any) {
    console.error('Error in snapshot endpoint:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
