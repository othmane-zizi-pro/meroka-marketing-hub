import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/random/posts/[id]/action - Handle actions on random posts
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, scheduledFor, timezone = 'America/New_York' } = body;

    if (!['proofreading', 'publish', 'schedule'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (action === 'schedule' && !scheduledFor) {
      return NextResponse.json({ error: 'Scheduled time is required' }, { status: 400 });
    }

    // Get current post
    const { data: post, error: fetchError } = await supabase
      .from('post_drafts')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Can only action pending_review or approved posts
    if (!['pending_review', 'approved', 'draft'].includes(post.status)) {
      return NextResponse.json({ error: 'Cannot action this post' }, { status: 400 });
    }

    let updates: Record<string, any> = {};

    switch (action) {
      case 'proofreading':
        updates = {
          route: 'proofreading',
          status: 'pending_review',
        };
        break;

      case 'schedule':
        updates = {
          route: 'scheduled',
          status: 'scheduled',
          scheduled_for: scheduledFor,
          scheduled_timezone: timezone,
        };
        break;

      case 'publish':
        // Publish immediately - call the publish endpoint
        const contentToPublish = post.current_content || post.content;
        let publishResult: { success: boolean; externalId?: string; externalUrl?: string; error?: string };

        if (post.channel === 'linkedin') {
          const formData = new FormData();
          formData.append('content', contentToPublish);
          formData.append('actionType', post.action_type || 'post');
          if (post.media_url) {
            formData.append('mediaUrl', post.media_url);
            if (post.media_type) {
              formData.append('mediaType', post.media_type);
            }
          }

          const response = await fetch(`${request.nextUrl.origin}/api/post/linkedin`, {
            method: 'POST',
            body: formData,
            headers: {
              Cookie: request.headers.get('cookie') || '',
            },
          });

          const data = await response.json();

          if (response.ok && data.post) {
            publishResult = {
              success: true,
              externalId: data.post.id,
              externalUrl: data.post.url,
            };
          } else {
            publishResult = { success: false, error: data.error || 'Failed to post to LinkedIn' };
          }
        } else if (post.channel === 'x') {
          const formData = new FormData();
          formData.append('postType', 'tweet');
          formData.append('content', contentToPublish);
          if (post.media_url) {
            formData.append('mediaUrl', post.media_url);
            if (post.media_type) {
              formData.append('mediaType', post.media_type);
            }
          }

          const response = await fetch(`${request.nextUrl.origin}/api/post/x`, {
            method: 'POST',
            body: formData,
            headers: {
              Cookie: request.headers.get('cookie') || '',
            },
          });

          const data = await response.json();

          if (response.ok && data.tweet) {
            publishResult = {
              success: true,
              externalId: data.tweet.id,
              externalUrl: `https://x.com/i/status/${data.tweet.id}`,
            };
          } else {
            publishResult = { success: false, error: data.error || 'Failed to post to X' };
          }
        } else {
          publishResult = { success: false, error: 'Unsupported channel' };
        }

        if (!publishResult.success) {
          return NextResponse.json({ error: publishResult.error }, { status: 500 });
        }

        updates = {
          status: 'published',
          published_at: new Date().toISOString(),
          external_id: publishResult.externalId,
          external_url: publishResult.externalUrl,
        };
        break;
    }

    const { data: updatedPost, error: updateError } = await supabase
      .from('post_drafts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating post:', updateError);
      return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
    }

    return NextResponse.json({
      post: updatedPost,
      action,
      message: action === 'publish'
        ? 'Published successfully'
        : action === 'schedule'
          ? 'Scheduled successfully'
          : 'Sent to proofreading',
    });
  } catch (error) {
    console.error('Error in POST /api/random/posts/[id]/action:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
