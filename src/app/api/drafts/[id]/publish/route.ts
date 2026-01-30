import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/drafts/[id]/publish - Publish a draft immediately
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
    const { data: draft, error: fetchError } = await supabase
      .from('post_drafts')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    // Can only publish approved or scheduled posts
    if (!['approved', 'scheduled'].includes(draft.status)) {
      return NextResponse.json({ error: 'Can only publish approved or scheduled posts' }, { status: 400 });
    }

    // Get the content to publish (current_content if edited, otherwise original content)
    const contentToPublish = draft.current_content || draft.content;

    // Call the appropriate posting API based on channel
    let publishResult: { success: boolean; externalId?: string; externalUrl?: string; error?: string };

    if (draft.channel === 'linkedin') {
      // Call LinkedIn posting API
      const formData = new FormData();
      formData.append('content', contentToPublish);
      if (draft.media_url) {
        formData.append('mediaUrl', draft.media_url);
        if (draft.media_type) {
          formData.append('mediaType', draft.media_type);
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
    } else if (draft.channel === 'x') {
      // Call X posting API
      const formData = new FormData();
      formData.append('postType', 'tweet');
      formData.append('content', contentToPublish);
      if (draft.media_url) {
        formData.append('mediaUrl', draft.media_url);
        if (draft.media_type) {
          formData.append('mediaType', draft.media_type);
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

    // Update draft as published
    const { data: updatedDraft, error: updateError } = await supabase
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
      // Post was published but we couldn't update the status - log but don't fail
    }

    return NextResponse.json({
      draft: updatedDraft || draft,
      externalId: publishResult.externalId,
      externalUrl: publishResult.externalUrl,
    });
  } catch (error) {
    console.error('Error in POST /api/drafts/[id]/publish:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
