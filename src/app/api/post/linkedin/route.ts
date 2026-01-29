import { NextRequest, NextResponse } from 'next/server';
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

    // Get LinkedIn connection for this user
    const { data: connection, error: connectionError } = await supabase
      .from('linkedin_connections')
      .select('*')
      .eq('user_email', authUser.email)
      .single();

    if (connectionError || !connection) {
      return NextResponse.json(
        { error: 'LinkedIn not connected. Please connect your LinkedIn account first.' },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (new Date(connection.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'LinkedIn connection expired. Please reconnect your LinkedIn account.' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const content = formData.get('content') as string;

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    if (content.length > 3000) {
      return NextResponse.json(
        { error: 'Content exceeds 3,000 characters' },
        { status: 400 }
      );
    }

    // Get the LinkedIn user's URN (person identifier)
    const linkedinUserId = connection.linkedin_user_id;
    if (!linkedinUserId) {
      return NextResponse.json(
        { error: 'LinkedIn user ID not found. Please reconnect your account.' },
        { status: 400 }
      );
    }

    // Create the post using LinkedIn's Posts API
    const postBody = {
      author: `urn:li:person:${linkedinUserId}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: content,
          },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    };

    const postResponse = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${connection.access_token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(postBody),
    });

    if (!postResponse.ok) {
      const errorText = await postResponse.text();
      console.error('LinkedIn post failed:', postResponse.status, errorText);

      if (postResponse.status === 401) {
        return NextResponse.json(
          { error: 'LinkedIn authorization expired. Please reconnect your account.' },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to post to LinkedIn. Please try again.' },
        { status: 500 }
      );
    }

    const postData = await postResponse.json();
    const postId = postData.id;

    // Extract the activity ID for the post URL
    // LinkedIn post IDs are in format: urn:li:share:123456789 or urn:li:ugcPost:123456789
    const activityId = postId?.split(':').pop();
    const postUrl = activityId
      ? `https://www.linkedin.com/feed/update/${postId}/`
      : null;

    // Get user details for saving
    const { data: userData } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('email', authUser.email)
      .single();

    // Save post to database
    await supabase.from('social_posts').insert({
      channel: 'linkedin',
      content: content,
      external_id: postId,
      external_url: postUrl,
      author_id: userData?.id || null,
      author_email: authUser.email || '',
      author_name: userData?.name || connection.linkedin_name || authUser.email?.split('@')[0] || 'Unknown',
    });

    return NextResponse.json({
      success: true,
      post: {
        id: postId,
        url: postUrl,
      },
    });
  } catch (error: any) {
    console.error('Error posting to LinkedIn:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to post to LinkedIn' },
      { status: 500 }
    );
  }
}

// GET endpoint to check LinkedIn connection status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ connected: false });
    }

    const { data: connection } = await supabase
      .from('linkedin_connections')
      .select('linkedin_name, expires_at')
      .eq('user_email', user.email)
      .single();

    if (!connection) {
      return NextResponse.json({ connected: false });
    }

    const isExpired = new Date(connection.expires_at) < new Date();

    return NextResponse.json({
      connected: !isExpired,
      linkedinName: connection.linkedin_name,
      expiresAt: connection.expires_at,
    });
  } catch (error) {
    return NextResponse.json({ connected: false });
  }
}
