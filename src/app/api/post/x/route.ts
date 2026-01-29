import { NextRequest, NextResponse } from 'next/server';
import { TwitterApi, EUploadMimeType } from 'twitter-api-v2';
import { createClient } from '@/lib/supabase/server';

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
    const content = formData.get('content') as string;
    const mediaFile = formData.get('media') as File | null;

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    if (content.length > 25000) {
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

    let mediaId: string | undefined;

    // Upload media if provided
    if (mediaFile) {
      const buffer = Buffer.from(await mediaFile.arrayBuffer());
      const mimeType = mediaFile.type;

      // Determine media type for Twitter
      let twitterMimeType: EUploadMimeType;
      if (mimeType.startsWith('image/gif')) {
        twitterMimeType = EUploadMimeType.Gif;
      } else if (mimeType.startsWith('image/')) {
        twitterMimeType = EUploadMimeType.Png; // Works for jpg, png, webp
      } else if (mimeType.startsWith('video/')) {
        twitterMimeType = EUploadMimeType.Mp4;
      } else {
        return NextResponse.json(
          { error: 'Unsupported media type. Use images (jpg, png, gif) or videos (mp4).' },
          { status: 400 }
        );
      }

      // Check file size (images: 5MB, GIFs: 15MB, videos: 512MB)
      const maxSize = mimeType.startsWith('video/') ? 512 * 1024 * 1024
        : mimeType.includes('gif') ? 15 * 1024 * 1024
        : 5 * 1024 * 1024;

      if (buffer.length > maxSize) {
        return NextResponse.json(
          { error: `File too large. Max size: ${maxSize / 1024 / 1024}MB` },
          { status: 400 }
        );
      }

      // Upload media to Twitter
      mediaId = await client.v1.uploadMedia(buffer, { mimeType: twitterMimeType });
    }

    // Post the tweet with or without media
    const tweetOptions: any = {};
    if (mediaId) {
      tweetOptions.media = { media_ids: [mediaId] };
    }

    const tweet = await client.v2.tweet(content, tweetOptions);

    const tweetUrl = `https://x.com/i/status/${tweet.data.id}`;

    // Save post to database
    await supabase.from('social_posts').insert({
      channel: 'x',
      content: content,
      external_id: tweet.data.id,
      external_url: tweetUrl,
      author_id: userData?.id || null,
      author_email: authUser.email || '',
      author_name: userData?.name || authUser.email?.split('@')[0] || 'Unknown',
    });

    return NextResponse.json({
      success: true,
      tweet: {
        id: tweet.data.id,
        text: tweet.data.text,
        url: tweetUrl,
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
