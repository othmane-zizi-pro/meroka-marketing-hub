import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/drafts/[id]/approve - Approve and publish a draft (author only)
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

    // Get current draft
    const { data: currentDraft, error: fetchError } = await supabase
      .from('post_drafts')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !currentDraft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    // Only author can approve
    if (currentDraft.author_email.toLowerCase() !== user.email?.toLowerCase()) {
      return NextResponse.json({ error: 'Only the original author can approve this post' }, { status: 403 });
    }

    // Can only approve pending_review posts
    if (currentDraft.status !== 'pending_review') {
      return NextResponse.json({ error: 'Can only approve posts pending review' }, { status: 400 });
    }

    // First, mark as approved
    await supabase
      .from('post_drafts')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
      })
      .eq('id', id);

    // Now publish the post immediately
    const contentToPublish = currentDraft.current_content || currentDraft.content;
    let publishResult: { success: boolean; externalId?: string; externalUrl?: string; error?: string };

    if (currentDraft.channel === 'linkedin') {
      // Call LinkedIn posting API
      const formData = new FormData();
      formData.append('content', contentToPublish);
      formData.append('actionType', currentDraft.action_type || 'post');
      if (currentDraft.target_post_urn) {
        formData.append('targetPostUrn', currentDraft.target_post_urn);
      }
      if (currentDraft.media_url) {
        formData.append('mediaUrl', currentDraft.media_url);
        if (currentDraft.media_type) {
          formData.append('mediaType', currentDraft.media_type);
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
    } else if (currentDraft.channel === 'x') {
      // Call X posting API
      const formData = new FormData();
      formData.append('postType', 'tweet');
      formData.append('content', contentToPublish);
      if (currentDraft.media_url) {
        formData.append('mediaUrl', currentDraft.media_url);
        if (currentDraft.media_type) {
          formData.append('mediaType', currentDraft.media_type);
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
      // Revert to pending_review if publishing failed
      await supabase
        .from('post_drafts')
        .update({
          status: 'failed',
          rejection_reason: publishResult.error,
        })
        .eq('id', id);

      return NextResponse.json({ error: publishResult.error }, { status: 500 });
    }

    // Update draft as published
    const { data: draft, error: updateError } = await supabase
      .from('post_drafts')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        external_id: publishResult.externalId,
        external_url: publishResult.externalUrl,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating draft status:', updateError);
    }

    return NextResponse.json({
      draft,
      externalId: publishResult.externalId,
      externalUrl: publishResult.externalUrl,
    });
  } catch (error) {
    console.error('Error in POST /api/drafts/[id]/approve:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
