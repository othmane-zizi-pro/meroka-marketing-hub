import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET - Retrieve follower history for charts
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get parameters
    const days = parseInt(request.nextUrl.searchParams.get('days') || '30');
    const platform = request.nextUrl.searchParams.get('platform') || 'all'; // 'all' | 'x' | 'linkedin'

    // Calculate start date
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    // Build query
    let query = supabase
      .from('follower_snapshots')
      .select('platform, follower_count, snapshot_date, metadata')
      .gte('snapshot_date', startDateStr)
      .order('snapshot_date', { ascending: true });

    if (platform !== 'all') {
      query = query.eq('platform', platform);
    }

    const { data: snapshots, error } = await query;

    if (error) {
      console.error('Error fetching follower history:', error);
      return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
    }

    // Group by date for combined view
    const byDate: Record<string, { date: string; x?: number; linkedin?: number; total: number }> = {};

    for (const snapshot of snapshots || []) {
      const date = snapshot.snapshot_date;
      if (!byDate[date]) {
        byDate[date] = { date, total: 0 };
      }
      byDate[date][snapshot.platform as 'x' | 'linkedin'] = snapshot.follower_count;
      byDate[date].total = (byDate[date].x || 0) + (byDate[date].linkedin || 0);
    }

    // Convert to array sorted by date
    const history = Object.values(byDate).sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Also return raw data by platform for detailed views
    const xHistory = snapshots?.filter(s => s.platform === 'x') || [];
    const linkedinHistory = snapshots?.filter(s => s.platform === 'linkedin') || [];

    return NextResponse.json({
      days,
      platform,
      history,
      byPlatform: {
        x: xHistory.map(s => ({
          date: s.snapshot_date,
          followers: s.follower_count,
          ...s.metadata,
        })),
        linkedin: linkedinHistory.map(s => ({
          date: s.snapshot_date,
          followers: s.follower_count,
          ...s.metadata,
        })),
      },
    });
  } catch (error: any) {
    console.error('Error in followers history:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
