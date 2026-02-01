import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { GenerationMetadata, LLMCouncilResponse } from '@/types/generation';

// Check if current time is within allowed generation window (4 AM - 6 PM EST)
function isWithinGenerationWindow(): boolean {
  const now = new Date();
  // Convert to EST (UTC-5, or UTC-4 during DST)
  const estOffset = -5; // Standard EST
  const utcHour = now.getUTCHours();
  const estHour = (utcHour + 24 + estOffset) % 24;

  // Allow generation from 4 AM to 6 PM EST (hours 4-17)
  return estHour >= 4 && estHour < 18;
}

// POST /api/random/generate - Generate new random posts from historical content
// Called by cron job or manually
// Only runs between 4 AM and 6 PM EST
export async function POST(request: NextRequest) {
  try {
    // Check for force parameter (for testing)
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    // Check time window first (skip if force=true)
    if (!force && !isWithinGenerationWindow()) {
      const now = new Date();
      console.log(`Generation skipped - outside window (4 AM - 6 PM EST). Current time: ${now.toISOString()}`);
      return NextResponse.json({
        message: 'Generation paused - outside business hours (4 AM - 6 PM EST)',
        generated: 0,
        skipped: true,
      });
    }

    // Verify the secret token
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('CRON_SECRET not configured');
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role client to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get active random campaigns
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('type', 'random')
      .eq('is_active', true);

    if (campaignsError) {
      console.error('Error fetching random campaigns:', campaignsError);
      return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
    }

    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json({ message: 'No active random campaigns', generated: 0 });
    }

    const results: { campaignName: string; generated: number; errors: string[] }[] = [];

    for (const campaign of campaigns) {
      const sourceConfig = campaign.source_config || {};
      const sourcePlatform = sourceConfig.source_platform || 'linkedin';
      const postsLimit = sourceConfig.posts_limit || 50;
      const postsPerRun = sourceConfig.posts_per_run || 5;

      const campaignResult = {
        campaignName: campaign.name,
        generated: 0,
        errors: [] as string[],
      };

      try {
        // Fetch historical posts as inspiration
        const { data: historicalPosts, error: postsError } = await supabase
          .from('social_posts')
          .select('id, content, external_url, author_name')
          .eq('channel', sourcePlatform)
          .not('content', 'is', null)
          .order('created_at', { ascending: false })
          .limit(postsLimit);

        if (postsError) {
          campaignResult.errors.push(`Failed to fetch historical posts: ${postsError.message}`);
          results.push(campaignResult);
          continue;
        }

        if (!historicalPosts || historicalPosts.length === 0) {
          campaignResult.errors.push('No historical posts found for inspiration');
          results.push(campaignResult);
          continue;
        }

        // Fetch top 3 published posts as few-shot examples
        // These are real posts from social_posts table (actual published content)
        console.log(`Fetching few-shot examples from social_posts for channel: ${sourcePlatform}`);

        let fewShotPosts: { content: string; engagement: string }[] = [];

        const { data: publishedPosts, error: publishedPostsError } = await supabase
          .from('social_posts')
          .select('content, external_url')
          .eq('channel', sourcePlatform)
          .not('content', 'is', null)
          .order('created_at', { ascending: false })
          .limit(10);  // Fetch 10, we'll pick best 3

        if (publishedPostsError) {
          console.error('Error fetching published posts:', publishedPostsError);
        } else if (publishedPosts && publishedPosts.length > 0) {
          // Use the 3 most recent posts as examples (they represent our current voice)
          fewShotPosts = publishedPosts.slice(0, 3).map(p => ({
            content: p.content,
            engagement: 'published', // We know these performed well enough to publish
          }));
          console.log(`Found ${fewShotPosts.length} published posts for few-shot examples`);
        } else {
          console.log('No published posts found for few-shot examples');
        }

        // Randomly select posts for inspiration
        const shuffled = historicalPosts.sort(() => Math.random() - 0.5);
        const inspirationPosts = shuffled.slice(0, postsPerRun);

        // Generate new content for each inspiration post
        for (const inspiration of inspirationPosts) {
          try {
            // Generate AI content based on inspiration
            // This calls the LLM to create new content inspired by the historical post
            // Pass published posts as few-shot examples
            const llmResponse = await generateContentFromInspiration(
              inspiration.content,
              sourcePlatform,
              fewShotPosts
            );

            if (!llmResponse) {
              campaignResult.errors.push(`Failed to generate content for inspiration: ${inspiration.id}`);
              continue;
            }

            // Build generation metadata from LLM Council response
            const generationMetadata: GenerationMetadata = {
              prompt: llmResponse.prompt,
              platform: sourcePlatform,
              inspiration_content: inspiration.content,
              models_used: llmResponse.models_used || ['gpt-5.2', 'gemini-3-pro-preview', 'grok-4-1-fast-reasoning'],
              candidates: llmResponse.candidates || [],
              winner: {
                source: llmResponse.source,
                content: llmResponse.content,
                reason: llmResponse.reason || 'No reason provided',
              },
              judge: {
                model: 'gemini-3-pro-preview',
                prompt: llmResponse.judge_prompt || '',
              },
              generated_at: new Date().toISOString(),
            };

            // Create a new draft linked to this campaign and inspiration
            const { error: insertError } = await supabase
              .from('post_drafts')
              .insert({
                content: llmResponse.content,
                channel: sourcePlatform,
                author_id: null, // AI generated
                author_email: 'ai@meroka.com',
                author_name: 'AI Generator',
                route: 'proofreading',
                status: 'pending_review',
                campaign_id: campaign.id,
                inspiration_post_id: inspiration.id,
                generation_metadata: generationMetadata,
              });

            if (insertError) {
              campaignResult.errors.push(`Failed to create draft: ${insertError.message}`);
              continue;
            }

            campaignResult.generated++;
          } catch (genError: any) {
            campaignResult.errors.push(`Generation error: ${genError.message}`);
          }
        }
      } catch (error: any) {
        campaignResult.errors.push(`Campaign processing error: ${error.message}`);
      }

      results.push(campaignResult);
    }

    const totalGenerated = results.reduce((sum, r) => sum + r.generated, 0);

    return NextResponse.json({
      message: `Generated ${totalGenerated} posts`,
      generated: totalGenerated,
      results,
    });
  } catch (error: any) {
    console.error('Error in random/generate:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Generate content from an inspiration post using LLM Council Lambda
async function generateContentFromInspiration(
  inspirationContent: string,
  platform: string,
  fewShotExamples: { content: string; engagement: string }[] = []
): Promise<LLMCouncilResponse | null> {
  try {
    console.log(`Calling LLM Council for ${platform} post with ${fewShotExamples.length} few-shot examples...`);

    const lambda = new LambdaClient({
      region: 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    const payload = JSON.stringify({
      inspiration: inspirationContent,
      platform,
      fewShotExamples,
    });

    const command = new InvokeCommand({
      FunctionName: 'llm-council',
      Payload: Buffer.from(payload),
    });

    const response = await lambda.send(command);

    if (response.StatusCode !== 200) {
      console.error('Lambda invocation failed:', response.StatusCode);
      return null;
    }

    const responsePayload = JSON.parse(Buffer.from(response.Payload!).toString());

    // The Lambda returns { statusCode, body } where body is a JSON string
    const result = typeof responsePayload.body === 'string'
      ? JSON.parse(responsePayload.body)
      : responsePayload.body || responsePayload;

    console.log(`LLM Council selected: ${result.source} - "${result.reason || 'No reason provided'}"`);

    if (!result.content) {
      return null;
    }

    return result as LLMCouncilResponse;
  } catch (error) {
    console.error('Error calling LLM Council:', error);
    return null;
  }
}

// Fallback content generation for development/testing
function createFallbackContent(inspiration: string, platform: string): string {
  // This is a placeholder - in production, this should always use the LLM
  const templates = platform === 'linkedin' ? [
    `Reflecting on our journey in healthcare innovation, we continue to see opportunities where technology meets compassion. What patterns have you noticed in your industry?`,
    `The intersection of healthcare and technology creates unique challenges - and even greater opportunities. We're excited to share more insights soon.`,
    `Building meaningful connections in healthcare starts with understanding the human element. Every data point represents a patient, a family, a story.`,
    `Innovation in health tech isn't just about the technology - it's about the impact on real people's lives. What drives your team's mission?`,
    `As we look ahead in healthcare innovation, one thing remains constant: our commitment to making a difference, one solution at a time.`,
  ] : [
    `Thinking about healthcare innovation today. The best solutions come from listening to real needs. What's on your mind?`,
    `Health tech is evolving fast. We're here for the journey. What trends are you following?`,
    `Every day brings new opportunities to make healthcare better. Small steps, big impact.`,
    `Connecting technology with compassion - that's what health innovation is all about.`,
    `What if we reimagined healthcare delivery? The future is closer than we think.`,
  ];

  // Select a random template
  const template = templates[Math.floor(Math.random() * templates.length)];
  return template;
}

// Health check
export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'random/generate' });
}
