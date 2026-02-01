import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/random/posts/candidate - Create a new draft from a candidate post
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { originalPostId, candidateContent, candidateSource, action, scheduledFor, timezone = 'America/New_York' } = body;

    if (!originalPostId || !candidateContent || !candidateSource) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['proofreading', 'schedule', 'publish'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (action === 'schedule' && !scheduledFor) {
      return NextResponse.json({ error: 'Scheduled time is required' }, { status: 400 });
    }

    // Fetch original post to get campaign_id, inspiration_post_id, channel, etc.
    const { data: originalPost, error: fetchError } = await supabase
      .from('post_drafts')
      .select('*')
      .eq('id', originalPostId)
      .single();

    if (fetchError || !originalPost) {
      return NextResponse.json({ error: 'Original post not found' }, { status: 404 });
    }

    // Build generation_metadata for the new draft
    const originalMetadata = originalPost.generation_metadata || {};
    const newMetadata = {
      ...originalMetadata,
      winner: {
        source: candidateSource,
        content: candidateContent,
        reason: `Manually selected alternate version (original winner: ${originalMetadata.winner?.source || 'unknown'})`,
      },
      selected_from_alternate: true,
      original_winner: originalMetadata.winner,
    };

    // Determine route and status based on action
    let route: string;
    let status: string;
    let scheduledForValue: string | null = null;
    let scheduledTimezone: string | null = null;

    switch (action) {
      case 'proofreading':
        route = 'proofreading';
        status = 'pending_review';
        break;
      case 'schedule':
        route = 'scheduled';
        status = 'scheduled';
        scheduledForValue = scheduledFor;
        scheduledTimezone = timezone;
        break;
      case 'publish':
        route = 'published';
        status = 'pending_publish'; // Will be updated after actual publish
        break;
      default:
        route = 'proofreading';
        status = 'pending_review';
    }

    // Create new draft with the candidate content
    const { data: newDraft, error: insertError } = await supabase
      .from('post_drafts')
      .insert({
        content: candidateContent,
        channel: originalPost.channel,
        author_id: user.id,
        author_email: user.email,
        author_name: 'AI Generator (Alternate)',
        route,
        status,
        campaign_id: originalPost.campaign_id,
        inspiration_post_id: originalPost.inspiration_post_id,
        generation_metadata: newMetadata,
        scheduled_for: scheduledForValue,
        scheduled_timezone: scheduledTimezone,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating new draft:', insertError);
      return NextResponse.json({ error: 'Failed to create draft' }, { status: 500 });
    }

    // If action is 'publish', immediately publish
    if (action === 'publish') {
      let publishResult: { success: boolean; externalId?: string; externalUrl?: string; error?: string };

      if (originalPost.channel === 'linkedin') {
        const formData = new FormData();
        formData.append('content', candidateContent);
        formData.append('actionType', originalPost.action_type || 'post');
        if (originalPost.media_url) {
          formData.append('mediaUrl', originalPost.media_url);
          if (originalPost.media_type) {
            formData.append('mediaType', originalPost.media_type);
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
      } else if (originalPost.channel === 'x') {
        const formData = new FormData();
        formData.append('postType', 'tweet');
        formData.append('content', candidateContent);
        if (originalPost.media_url) {
          formData.append('mediaUrl', originalPost.media_url);
          if (originalPost.media_type) {
            formData.append('mediaType', originalPost.media_type);
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
        // Delete the draft if publish failed
        await supabase.from('post_drafts').delete().eq('id', newDraft.id);
        return NextResponse.json({ error: publishResult.error }, { status: 500 });
      }

      // Update the draft with publish info
      const { data: updatedDraft, error: updateError } = await supabase
        .from('post_drafts')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          external_id: publishResult.externalId,
          external_url: publishResult.externalUrl,
        })
        .eq('id', newDraft.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating draft after publish:', updateError);
      }

      return NextResponse.json({
        draft: updatedDraft || newDraft,
        action,
        message: 'Published successfully',
      });
    }

    return NextResponse.json({
      draft: newDraft,
      action,
      message: action === 'schedule'
        ? 'Scheduled successfully'
        : 'Sent to proofreading',
    });
  } catch (error) {
    console.error('Error in POST /api/random/posts/candidate:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
