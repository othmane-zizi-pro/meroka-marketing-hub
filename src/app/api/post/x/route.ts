import { NextRequest, NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json();

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    if (content.length > 280) {
      return NextResponse.json(
        { error: 'Content exceeds 280 characters' },
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

    // Post the tweet
    const tweet = await client.v2.tweet(content);

    return NextResponse.json({
      success: true,
      tweet: {
        id: tweet.data.id,
        text: tweet.data.text,
      },
    });
  } catch (error: any) {
    console.error('Error posting to X:', error);

    // Handle specific Twitter API errors
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
      { error: error.message || 'Failed to post to X' },
      { status: 500 }
    );
  }
}
