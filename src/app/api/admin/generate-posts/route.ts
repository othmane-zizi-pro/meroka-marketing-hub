import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ADMIN_EMAIL = 'othmane.zizi@meroka.com';

// POST /api/admin/generate-posts - Admin-only endpoint to trigger post generation
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify user is authenticated and is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Call the internal generate endpoint
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    // Build the URL for the internal generate endpoint
    const url = new URL('/api/random/generate', request.url);
    url.searchParams.set('force', 'true');

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error in admin/generate-posts:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
