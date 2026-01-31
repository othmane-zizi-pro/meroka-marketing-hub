import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Send notification to Slack
async function sendSlackNotification(
  authorName: string,
  organizationName: string,
  content: string,
  postUrl: string | null
) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    const truncatedContent = content.length > 200
      ? content.substring(0, 200) + '...'
      : content;

    const message = {
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*New LinkedIn Post* :briefcase:\n*Company:* ${organizationName}\n*Posted by:* ${authorName}`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `>${truncatedContent.replace(/\n/g, '\n>')}`,
          },
        },
        ...(postUrl ? [{
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
        }] : []),
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

    // Get shared admin LinkedIn connection (any team member can use it)
    const { data: connection, error: connectionError } = await supabase
      .from('linkedin_connections')
      .select('*')
      .eq('user_email', 'shared_admin')
      .single();

    if (connectionError || !connection) {
      return NextResponse.json(
        { error: 'LinkedIn not connected. An admin needs to connect the company LinkedIn page first.' },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (new Date(connection.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'LinkedIn connection expired. An admin needs to reconnect the company LinkedIn page.' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const actionType = (formData.get('actionType') as string) || 'post';
    const content = formData.get('content') as string;
    const targetPostUrn = formData.get('targetPostUrn') as string | null;
    const mediaFile = formData.get('media') as File | null;
    const mediaUrl = formData.get('mediaUrl') as string | null; // S3 URL for videos
    const mediaType = formData.get('mediaType') as string | null;

    // Validate based on action type
    if (actionType === 'like') {
      // Like doesn't need content
      if (!targetPostUrn) {
        return NextResponse.json(
          { error: 'Target post URL is required for liking' },
          { status: 400 }
        );
      }
    } else if (actionType === 'repost') {
      // Repost needs target, content is optional
      if (!targetPostUrn) {
        return NextResponse.json(
          { error: 'Target post URL is required' },
          { status: 400 }
        );
      }
    } else if (actionType === 'comment') {
      // Comment needs both content and target
      if (!content || content.trim().length === 0) {
        return NextResponse.json(
          { error: 'Content is required' },
          { status: 400 }
        );
      }
      if (!targetPostUrn) {
        return NextResponse.json(
          { error: 'Target post URL is required' },
          { status: 400 }
        );
      }
    } else {
      // Regular post needs content
      if (!content || content.trim().length === 0) {
        return NextResponse.json(
          { error: 'Content is required' },
          { status: 400 }
        );
      }
    }

    if (content && content.length > 3000) {
      return NextResponse.json(
        { error: 'Content exceeds 3,000 characters' },
        { status: 400 }
      );
    }

    // Get the organization ID for company page posting
    const organizationId = connection.organization_id;
    if (!organizationId) {
      return NextResponse.json(
        { error: 'No LinkedIn organization found. Please reconnect with admin access to your company page.' },
        { status: 400 }
      );
    }

    // Get user details for saving
    const { data: userData } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('email', authUser.email)
      .single();

    const authorName = userData?.name || connection.linkedin_name || authUser.email?.split('@')[0] || 'Unknown';

    // Handle Like action
    if (actionType === 'like') {
      try {
        // LinkedIn reactions API uses the socialActions endpoint
        const reactionResponse = await fetch(`https://api.linkedin.com/v2/reactions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
          },
          body: JSON.stringify({
            root: targetPostUrn,
            reactionType: 'LIKE',
            actor: `urn:li:organization:${organizationId}`,
          }),
        });

        if (!reactionResponse.ok) {
          const errorText = await reactionResponse.text();
          console.error('LinkedIn like failed:', reactionResponse.status, errorText);
          return NextResponse.json(
            { error: `Failed to like post: ${errorText.substring(0, 200)}` },
            { status: 500 }
          );
        }

        // Save to database
        await supabase.from('social_posts').insert({
          channel: 'linkedin',
          content: `Liked a post`,
          external_id: null,
          external_url: null,
          author_id: userData?.id || null,
          author_email: authUser.email || '',
          author_name: authorName,
          action_type: 'like',
          target_url: targetPostUrn,
        });

        return NextResponse.json({
          success: true,
          post: { id: null, url: null },
        });
      } catch (error: any) {
        console.error('Error liking on LinkedIn:', error);
        return NextResponse.json(
          { error: error.message || 'Failed to like on LinkedIn' },
          { status: 500 }
        );
      }
    }

    // Handle Comment action
    if (actionType === 'comment') {
      try {
        const commentResponse = await fetch(`https://api.linkedin.com/v2/socialActions/${encodeURIComponent(targetPostUrn!)}/comments`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
          },
          body: JSON.stringify({
            actor: `urn:li:organization:${organizationId}`,
            message: {
              text: content,
            },
          }),
        });

        if (!commentResponse.ok) {
          const errorText = await commentResponse.text();
          console.error('LinkedIn comment failed:', commentResponse.status, errorText);
          return NextResponse.json(
            { error: `Failed to comment: ${errorText.substring(0, 200)}` },
            { status: 500 }
          );
        }

        const commentData = await commentResponse.json();
        const commentId = commentData.id || commentData['$URN'];

        // Save to database
        await supabase.from('social_posts').insert({
          channel: 'linkedin',
          content: content,
          external_id: commentId,
          external_url: null,
          author_id: userData?.id || null,
          author_email: authUser.email || '',
          author_name: authorName,
          action_type: 'comment',
          target_url: targetPostUrn,
        });

        sendSlackNotification(
          authorName,
          connection.organization_name || 'Company',
          `Commented: ${content}`,
          null
        );

        return NextResponse.json({
          success: true,
          post: { id: commentId, url: null },
        });
      } catch (error: any) {
        console.error('Error commenting on LinkedIn:', error);
        return NextResponse.json(
          { error: error.message || 'Failed to comment on LinkedIn' },
          { status: 500 }
        );
      }
    }

    // Handle Repost (share with optional commentary)
    if (actionType === 'repost') {
      try {
        const repostBody = {
          author: `urn:li:organization:${organizationId}`,
          commentary: content?.trim() || '', // Empty string if no commentary
          visibility: 'PUBLIC',
          distribution: {
            feedDistribution: 'MAIN_FEED',
            targetEntities: [],
            thirdPartyDistributionChannels: [],
          },
          lifecycleState: 'PUBLISHED',
          isReshareDisabledByAuthor: false,
          reshareContext: {
            parent: targetPostUrn,
          },
        };

        const repostResponse = await fetch('https://api.linkedin.com/rest/posts', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
            'LinkedIn-Version': '202601',
          },
          body: JSON.stringify(repostBody),
        });

        if (!repostResponse.ok) {
          const errorText = await repostResponse.text();
          console.error('LinkedIn repost failed:', repostResponse.status, errorText);
          return NextResponse.json(
            { error: `Failed to repost: ${errorText.substring(0, 200)}` },
            { status: 500 }
          );
        }

        const postId = repostResponse.headers.get('x-restli-id');
        const postUrl = postId
          ? `https://www.linkedin.com/feed/update/${postId}/`
          : null;

        // Save to database
        await supabase.from('social_posts').insert({
          channel: 'linkedin',
          content: content?.trim() || 'Reposted',
          external_id: postId,
          external_url: postUrl,
          author_id: userData?.id || null,
          author_email: authUser.email || '',
          author_name: authorName,
          action_type: 'repost',
          target_url: targetPostUrn,
        });

        sendSlackNotification(
          authorName,
          connection.organization_name || 'Company',
          content?.trim() ? `Repost: ${content}` : 'Reposted a post',
          postUrl
        );

        return NextResponse.json({
          success: true,
          post: { id: postId, url: postUrl },
        });
      } catch (error: any) {
        console.error('Error reposting on LinkedIn:', error);
        return NextResponse.json(
          { error: error.message || 'Failed to repost on LinkedIn' },
          { status: 500 }
        );
      }
    }

    // Regular post - continue with existing logic
    let mediaAsset: string | null = null;
    let isVideo = false;

    // Check if we have a video (either from S3 URL or direct upload)
    const hasVideo = (mediaUrl && mediaType?.startsWith('video/')) ||
                     (mediaFile && mediaFile.type.startsWith('video/'));

    // Upload video if provided
    if (hasVideo) {
      isVideo = true;
      try {
        let videoBuffer: Buffer;
        let videoMimeType: string;

        if (mediaUrl && mediaType) {
          // Download from S3
          console.log('Downloading video from S3 for LinkedIn:', mediaUrl);
          const s3Response = await fetch(mediaUrl);
          if (!s3Response.ok) {
            throw new Error(`Failed to fetch video from storage: ${s3Response.status}`);
          }
          videoBuffer = Buffer.from(await s3Response.arrayBuffer());
          videoMimeType = mediaType;
        } else if (mediaFile) {
          videoBuffer = Buffer.from(await mediaFile.arrayBuffer());
          videoMimeType = mediaFile.type;
        } else {
          throw new Error('No video provided');
        }

        console.log('Video size:', videoBuffer.length, 'type:', videoMimeType);

        // Step 1: Initialize video upload
        const initResponse = await fetch('https://api.linkedin.com/rest/videos?action=initializeUpload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
            'LinkedIn-Version': '202401',
          },
          body: JSON.stringify({
            initializeUploadRequest: {
              owner: `urn:li:organization:${organizationId}`,
              fileSizeBytes: videoBuffer.length,
            },
          }),
        });

        if (!initResponse.ok) {
          const errorText = await initResponse.text();
          console.error('LinkedIn video init failed:', initResponse.status, errorText);
          throw new Error(`LinkedIn video init failed: ${initResponse.status}`);
        }

        const initData = await initResponse.json();
        console.log('LinkedIn video init response:', JSON.stringify(initData, null, 2));

        const uploadUrl = initData.value?.uploadInstructions?.[0]?.uploadUrl;
        mediaAsset = initData.value?.video;

        if (!uploadUrl || !mediaAsset) {
          throw new Error('Failed to get video upload URL from LinkedIn');
        }

        // Step 2: Upload the video binary
        console.log('Uploading video to LinkedIn...');
        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
            'Content-Type': 'application/octet-stream',
          },
          body: new Uint8Array(videoBuffer),
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error('LinkedIn video upload failed:', uploadResponse.status, errorText);
          throw new Error(`LinkedIn video upload failed: ${uploadResponse.status}`);
        }

        // Step 3: Finalize the upload
        const finalizeResponse = await fetch('https://api.linkedin.com/rest/videos?action=finalizeUpload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
            'LinkedIn-Version': '202401',
          },
          body: JSON.stringify({
            finalizeUploadRequest: {
              video: mediaAsset,
              uploadToken: '',
              uploadedPartIds: [],
            },
          }),
        });

        if (!finalizeResponse.ok) {
          const errorText = await finalizeResponse.text();
          console.error('LinkedIn video finalize failed:', finalizeResponse.status, errorText);
          // Continue anyway - some API versions don't require finalization
        }

        console.log('LinkedIn video upload complete, asset:', mediaAsset);

      } catch (videoError: any) {
        console.error('Error uploading video to LinkedIn:', videoError);
        return NextResponse.json(
          { error: `Failed to upload video: ${videoError.message}` },
          { status: 500 }
        );
      }
    }

    // Upload image if provided
    if (!hasVideo && mediaFile && mediaFile.type.startsWith('image/')) {
      try {
        // Step 1: Initialize the upload
        const initResponse = await fetch('https://api.linkedin.com/rest/images?action=initializeUpload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
            'LinkedIn-Version': '202601',
          },
          body: JSON.stringify({
            initializeUploadRequest: {
              owner: `urn:li:organization:${organizationId}`,
            },
          }),
        });

        if (!initResponse.ok) {
          console.error('LinkedIn image init failed:', await initResponse.text());
        } else {
          const initData = await initResponse.json();
          const uploadUrl = initData.value?.uploadUrl;
          mediaAsset = initData.value?.image;

          if (uploadUrl && mediaAsset) {
            // Step 2: Upload the image binary
            const imageBuffer = Buffer.from(await mediaFile.arrayBuffer());
            const uploadResponse = await fetch(uploadUrl, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${connection.access_token}`,
                'Content-Type': mediaFile.type,
              },
              body: imageBuffer,
            });

            if (!uploadResponse.ok) {
              console.error('LinkedIn image upload failed:', uploadResponse.status);
              mediaAsset = null;
            }
          }
        }
      } catch (uploadError) {
        console.error('Error uploading image to LinkedIn:', uploadError);
      }
    }

    // Create the post using LinkedIn's REST Posts API (organization posting)
    const postBody: any = {
      author: `urn:li:organization:${organizationId}`,
      commentary: content,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    };

    // Add media content if we have an image
    if (mediaAsset) {
      postBody.content = {
        media: {
          id: mediaAsset,
        },
      };
    }

    const postResponse = await fetch('https://api.linkedin.com/rest/posts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${connection.access_token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202601',
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

      // Return actual error for debugging
      return NextResponse.json(
        { error: `LinkedIn API error (${postResponse.status}): ${errorText.substring(0, 200)}` },
        { status: 500 }
      );
    }

    // REST Posts API returns the post URN in the x-restli-id header
    const postId = postResponse.headers.get('x-restli-id');

    // Extract the activity ID for the post URL
    // LinkedIn post IDs are in format: urn:li:share:123456789
    const postUrl = postId
      ? `https://www.linkedin.com/feed/update/${postId}/`
      : null;

    // Save post to database
    await supabase.from('social_posts').insert({
      channel: 'linkedin',
      content: content,
      external_id: postId,
      external_url: postUrl,
      author_id: userData?.id || null,
      author_email: authUser.email || '',
      author_name: authorName,
      action_type: 'post',
    });

    // Send Slack notification
    sendSlackNotification(
      authorName,
      connection.organization_name || 'Company',
      content,
      postUrl
    );

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

// GET endpoint to check LinkedIn connection status (shared connection)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ connected: false });
    }

    // Check for shared admin connection (used by all team members)
    const { data: connection } = await supabase
      .from('linkedin_connections')
      .select('linkedin_name, organization_id, organization_name, expires_at, connected_by')
      .eq('user_email', 'shared_admin')
      .single();

    if (!connection) {
      return NextResponse.json({ connected: false });
    }

    const isExpired = new Date(connection.expires_at) < new Date();
    const hasOrganization = !!connection.organization_id;

    return NextResponse.json({
      connected: !isExpired && hasOrganization,
      linkedinName: connection.linkedin_name,
      organizationName: connection.organization_name,
      organizationId: connection.organization_id,
      connectedBy: connection.connected_by,
      expiresAt: connection.expires_at,
      // If connected but no org, they need to reconnect with proper permissions
      needsReconnect: !isExpired && !hasOrganization,
      isExpired,
    });
  } catch (error) {
    return NextResponse.json({ connected: false });
  }
}
