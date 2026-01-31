import { NextRequest, NextResponse } from 'next/server';

// Cron job endpoint for generating random posts
// This endpoint is called by AWS Lambda or cron scheduler (e.g., hourly)

export async function POST(request: NextRequest) {
  try {
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

    // Call the generate endpoint
    const response = await fetch(`${request.nextUrl.origin}/api/random/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Error from generate endpoint:', data.error);
      return NextResponse.json({ error: data.error }, { status: response.status });
    }

    console.log(`Random post generation complete:`, data);

    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (error: any) {
    console.error('Error in generate-random cron:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Health check
export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'cron/generate-random' });
}
