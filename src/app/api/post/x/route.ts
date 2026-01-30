import { NextRequest, NextResponse } from 'next/server';
import { TwitterApi, EUploadMimeType } from 'twitter-api-v2';
import { createClient } from '@/lib/supabase/server';

// Allow larger body size for video uploads (up to 512MB)
export const maxDuration = 300; // 5 minutes for video processing
export const dynamic = 'force-dynamic';

type PostType = 'tweet' | 'reply' | 'quote' | 'retweet' | 'like';

// Send notification to Slack
async function sendSlackNotification(
  actionType: string,
  authorName: string,
  content: string | null,
  postUrl: string
) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    const truncatedContent = content
      ? (content.length > 200 ? content.substring(0, 200) + '...' : content)
      : '';

    const message = {
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*New ${actionType} on X* :bird:\n*Posted by:* ${authorName}`,
          },
        },
        ...(truncatedContent ? [{
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `>${truncatedContent.replace(/\n/g, '\n>')}`,
          },
        }] : []),
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Post',
                emoji: true,
              },
              url: postUrl,
              style: 'primary',
            },
          ],
        },
      ],
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
  } catch (error) {
    console.error('Failed to send Slack notification:', error);
  }
}

export async function POST(request: NextRequest) {
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

    // Get user details from users table
    const { data: userData } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('email', authUser.email)
      .single();

    const formData = await request.formData();
    const postType = (formData.get('postType') as PostType) || 'tweet';
    const content = formData.get('content') as string | null;
    const targetTweetId = formData.get('tweetId') as string | null;
    const mediaFile = formData.get('media') as File | null;

    // Validate based on post type
    const requiresContent = ['tweet', 'reply', 'quote'].includes(postType);
    const requiresTweetId = ['reply', 'quote', 'retweet', 'like'].includes(postType);

    if (requiresContent && (!content || typeof content !== 'string' || content.trim().length === 0)) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    if (requiresTweetId && !targetTweetId) {
      return NextResponse.json(
        { error: 'Tweet ID is required for this action' },
        { status: 400 }
      );
    }

    if (content && content.length > 25000) {
      return NextResponse.json(
        { error: 'Content exceeds 25,000 characters' },
        { status: 400 }
      );
    }

    // Check for required environment variables
    const apiKey = process.env.X_API_KEY;
    const apiSecret = process.env.X_API_SECRET;
    const accessToken = process.env.X_ACCESS_TOKEN;
    const accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET;

    if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
      console.error('Missing X API credentials');
      return NextResponse.json(
        { error: 'X API credentials not configured' },
        { status: 500 }
      );
    }

    // Initialize Twitter client with OAuth 1.0a User Context
    const client = new TwitterApi({
      appKey: apiKey,
      appSecret: apiSecret,
      accessToken: accessToken,
      accessSecret: accessTokenSecret,
    });

    // Get authenticated user's Twitter ID (needed for retweet/like)
    const me = await client.v2.me();
    const myUserId = me.data.id;

    let result: any;
    let resultUrl: string | null = null;
    let actionDescription: string;

    switch (postType) {
      case 'tweet': {
        let mediaId: string | undefined;

        // Upload media if provided
        if (mediaFile) {
          const buffer = Buffer.from(await mediaFile.arrayBuffer());
          const mimeType = mediaFile.type;

          let twitterMimeType: EUploadMimeType;

          if (mimeType.startsWith('image/gif')) {
            twitterMimeType = EUploadMimeType.Gif;
          } else if (mimeType.startsWith('image/')) {
            twitterMimeType = EUploadMimeType.Png;
          } else if (mimeType === 'video/quicktime') {
            twitterMimeType = EUploadMimeType.Mov;
          } else if (mimeType.startsWith('video/')) {
            twitterMimeType = EUploadMimeType.Mp4;
          } else {
            return NextResponse.json(
              { error: 'Unsupported media type. Use images (jpg, png, gif) or videos (mp4, mov).' },
              { status: 400 }
            );
          }

          // Vercel serverless body limit is ~50MB on Pro plan
          const maxSize = mimeType.startsWith('video/') ? 50 * 1024 * 1024
            : mimeType.includes('gif') ? 15 * 1024 * 1024
            : 5 * 1024 * 1024;

          if (buffer.length > maxSize) {
            return NextResponse.json(
              { error: `File too large. Max size: ${maxSize / 1024 / 1024}MB` },
              { status: 400 }
            );
          }

          try {
            // Upload media with appropriate settings
            // For videos, the library handles chunked upload automatically
            mediaId = await client.v1.uploadMedia(buffer, {
              mimeType: twitterMimeType,
              target: 'tweet',
              longVideo: mimeType.startsWith('video/'),
            });
          } catch (uploadError: any) {
            console.error('Media upload error:', uploadError);
            return NextResponse.json(
              { error: `Failed to upload media: ${uploadError.message || 'Unknown error'}` },
              { status: 500 }
            );
          }
        }

        const tweetOptions: any = {};
        if (mediaId) {
          tweetOptions.media = { media_ids: [mediaId] };
        }

        const tweet = await client.v2.tweet(content!, tweetOptions);
        result = { id: tweet.data.id, text: tweet.data.text };
        resultUrl = `https://x.com/i/status/${tweet.data.id}`;
        actionDescription = 'Tweet';
        break;
      }

      case 'reply': {
        const tweet = await client.v2.tweet(content!, {
          reply: { in_reply_to_tweet_id: targetTweetId! }
        });
        result = { id: tweet.data.id, text: tweet.data.text };
        resultUrl = `https://x.com/i/status/${tweet.data.id}`;
        actionDescription = 'Reply';
        break;
      }

      case 'quote': {
        const tweet = await client.v2.tweet(content!, {
          quote_tweet_id: targetTweetId!
        });
        result = { id: tweet.data.id, text: tweet.data.text };
        resultUrl = `https://x.com/i/status/${tweet.data.id}`;
        actionDescription = 'Quote tweet';
        break;
      }

      case 'retweet': {
        await client.v2.retweet(myUserId, targetTweetId!);
        result = { retweeted_tweet_id: targetTweetId };
        resultUrl = `https://x.com/i/status/${targetTweetId}`;
        actionDescription = 'Retweet';
        break;
      }

      case 'like': {
        await client.v2.like(myUserId, targetTweetId!);
        result = { liked_tweet_id: targetTweetId };
        resultUrl = `https://x.com/i/status/${targetTweetId}`;
        actionDescription = 'Like';
        break;
      }

      default:
        return NextResponse.json(
          { error: 'Invalid post type' },
          { status: 400 }
        );
    }

    // Save to database (only for content-creating actions)
    const authorName = userData?.name || authUser.email?.split('@')[0] || 'Unknown';
    if (['tweet', 'reply', 'quote'].includes(postType) && content) {
      await supabase.from('social_posts').insert({
        channel: 'x',
        content: content,
        external_id: result.id,
        external_url: resultUrl,
        author_id: userData?.id || null,
        author_email: authUser.email || '',
        author_name: authorName,
      });
    }

    // Send Slack notification
    if (resultUrl) {
      sendSlackNotification(
        actionDescription,
        authorName,
        content || null,
        resultUrl
      );
    }

    return NextResponse.json({
      success: true,
      action: actionDescription,
      result,
      tweet: result, // For backward compatibility
    });
  } catch (error: any) {
    console.error('Error with X API:', error);

    if (error.code === 403) {
      return NextResponse.json(
        { error: 'Access denied. Check your X API permissions.' },
        { status: 403 }
      );
    }

    if (error.code === 429) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to complete X action' },
      { status: 500 }
    );
  }
}
