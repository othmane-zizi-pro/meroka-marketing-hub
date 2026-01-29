import { NextRequest, NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';
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

    // Get tweet IDs from query params
    const tweetIds = request.nextUrl.searchParams.get('ids');
    if (!tweetIds) {
      return NextResponse.json(
        { error: 'Tweet IDs required' },
        { status: 400 }
      );
    }

    const ids = tweetIds.split(',').filter(id => id.trim());
    if (ids.length === 0) {
      return NextResponse.json({ metrics: {} });
    }

    // Check for required environment variables
    const apiKey = process.env.X_API_KEY;
    const apiSecret = process.env.X_API_SECRET;
    const accessToken = process.env.X_ACCESS_TOKEN;
    const accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET;

    if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
      return NextResponse.json(
        { error: 'X API credentials not configured' },
        { status: 500 }
      );
    }

    // Initialize Twitter client
    const client = new TwitterApi({
      appKey: apiKey,
      appSecret: apiSecret,
      accessToken: accessToken,
      accessSecret: accessTokenSecret,
    });

    // Fetch tweets with metrics
    // public_metrics: likes, retweets, replies, quotes (always available)
    // non_public_metrics: impressions, user_profile_clicks, url_link_clicks (requires elevated access)
    const tweets = await client.v2.tweets(ids, {
      'tweet.fields': ['public_metrics', 'created_at'],
    });

    // Build metrics map
    const metrics: Record<string, {
      likes: number;
      retweets: number;
      replies: number;
      quotes: number;
      impressions?: number;
    }> = {};

    if (tweets.data) {
      for (const tweet of tweets.data) {
        if (tweet.public_metrics) {
          metrics[tweet.id] = {
            likes: tweet.public_metrics.like_count || 0,
            retweets: tweet.public_metrics.retweet_count || 0,
            replies: tweet.public_metrics.reply_count || 0,
            quotes: tweet.public_metrics.quote_count || 0,
          };
        }
      }
    }

    return NextResponse.json({ metrics });
  } catch (error: any) {
    console.error('Error fetching tweet metrics:', error);

    // Check for specific error codes
    if (error.code === 403) {
      return NextResponse.json(
        { error: 'Access denied. Your API tier may not support metrics.' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
