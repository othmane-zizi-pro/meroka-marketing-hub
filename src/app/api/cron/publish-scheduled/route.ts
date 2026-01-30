import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// This endpoint is called by AWS Lambda to publish scheduled posts
// Protected by CRON_SECRET

export async function POST(request: NextRequest) {
  try {
    // Verify the secret token
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('CRON_SECRET not configured');
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role client to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Find posts that are due (scheduled_for <= now, status = 'scheduled')
    const now = new Date().toISOString();
    const { data: duePosts, error: fetchError } = await supabase
      .from('post_drafts')
      .select('*')
      .eq('status', 'scheduled')
      .eq('route', 'scheduled')
      .lte('scheduled_for', now);

    if (fetchError) {
      console.error('Error fetching due posts:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
    }

    if (!duePosts || duePosts.length === 0) {
      return NextResponse.json({ message: 'No posts due', published: 0 });
    }

    console.log(`Found ${duePosts.length} posts due for publishing`);

    const results: { id: string; success: boolean; error?: string }[] = [];

    for (const draft of duePosts) {
      try {
        // Get the content to publish
        const contentToPublish = draft.current_content || draft.content;

        let publishResult: { success: boolean; externalId?: string; externalUrl?: string; error?: string };

        if (draft.channel === 'linkedin') {
          // Get LinkedIn connection
          const { data: connection } = await supabase
            .from('linkedin_connections')
            .select('*')
            .single();

          if (!connection) {
            throw new Error('LinkedIn not connected');
          }

          // Check if token is expired
          if (new Date(connection.expires_at) <= new Date()) {
            throw new Error('LinkedIn token expired');
          }

          // Post to LinkedIn
          const postBody: any = {
            author: `urn:li:organization:${connection.organization_id}`,
            lifecycleState: 'PUBLISHED',
            specificContent: {
              'com.linkedin.ugc.ShareContent': {
                shareCommentary: {
                  text: contentToPublish,
                },
                shareMediaCategory: 'NONE',
              },
            },
            visibility: {
              'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
            },
          };

          const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${connection.access_token}`,
              'Content-Type': 'application/json',
              'X-Restli-Protocol-Version': '2.0.0',
            },
            body: JSON.stringify(postBody),
          });

          if (response.ok) {
            const data = await response.json();
            const postId = data.id;
            const activityId = postId?.replace('urn:li:share:', '') || postId?.replace('urn:li:ugcPost:', '');
            publishResult = {
              success: true,
              externalId: postId,
              externalUrl: `https://www.linkedin.com/feed/update/${activityId}`,
            };
          } else {
            const errorText = await response.text();
            publishResult = { success: false, error: `LinkedIn API error: ${response.status} - ${errorText}` };
          }
        } else if (draft.channel === 'x') {
          // Post to X/Twitter
          const { TwitterApi } = await import('twitter-api-v2');

          const client = new TwitterApi({
            appKey: process.env.TWITTER_API_KEY!,
            appSecret: process.env.TWITTER_API_SECRET!,
            accessToken: process.env.TWITTER_ACCESS_TOKEN!,
            accessSecret: process.env.TWITTER_ACCESS_SECRET!,
          });

          const tweet = await client.v2.tweet(contentToPublish);

          if (tweet.data) {
            publishResult = {
              success: true,
              externalId: tweet.data.id,
              externalUrl: `https://x.com/i/status/${tweet.data.id}`,
            };
          } else {
            publishResult = { success: false, error: 'Failed to post tweet' };
          }
        } else {
          publishResult = { success: false, error: `Unsupported channel: ${draft.channel}` };
        }

        if (publishResult.success) {
          // Update draft as published
          await supabase
            .from('post_drafts')
            .update({
              status: 'published',
              published_at: new Date().toISOString(),
              external_id: publishResult.externalId,
              external_url: publishResult.externalUrl,
            })
            .eq('id', draft.id);

          // Also record in social_posts for activity feed
          await supabase.from('social_posts').insert({
            channel: draft.channel,
            content: contentToPublish,
            external_id: publishResult.externalId,
            external_url: publishResult.externalUrl,
            author_name: draft.author_name,
            author_email: draft.author_email,
          });

          results.push({ id: draft.id, success: true });
          console.log(`Published post ${draft.id} to ${draft.channel}`);
        } else {
          // Mark as failed for retry
          await supabase
            .from('post_drafts')
            .update({
              status: 'failed',
              rejection_reason: publishResult.error,
            })
            .eq('id', draft.id);

          results.push({ id: draft.id, success: false, error: publishResult.error });
          console.error(`Failed to publish post ${draft.id}:`, publishResult.error);
        }
      } catch (error: any) {
        console.error(`Error publishing post ${draft.id}:`, error);

        // Mark as failed
        await supabase
          .from('post_drafts')
          .update({
            status: 'failed',
            rejection_reason: error.message,
          })
          .eq('id', draft.id);

        results.push({ id: draft.id, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      message: `Published ${successCount} posts, ${failCount} failed`,
      published: successCount,
      failed: failCount,
      results,
    });
  } catch (error: any) {
    console.error('Error in publish-scheduled cron:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Also support GET for health checks
export async function GET(request: NextRequest) {
  return NextResponse.json({ status: 'ok', endpoint: 'publish-scheduled' });
}
