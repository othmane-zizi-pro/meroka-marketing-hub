'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUser } from '@/hooks/useUser';
import { Linkedin, Instagram, ArrowRight, TrendingUp, Loader2 } from 'lucide-react';
import { XIcon } from '@/components/ui/icons';
import { createClient } from '@/lib/supabase/client';

const channelIcons: Record<string, any> = {
  linkedin: Linkedin,
  x: XIcon,
  instagram: Instagram,
};

const channelNames: Record<string, string> = {
  linkedin: 'LinkedIn',
  x: 'X',
  instagram: 'Instagram',
};

const channelColors: Record<string, string> = {
  linkedin: 'bg-brand-navy-600',
  x: 'bg-brand-navy-800',
  instagram: 'bg-gradient-to-br from-brand-brown-dark to-brand-brown',
};

const channelRoutes: Record<string, string> = {
  linkedin: '/channels/linkedin',
  x: '/channels/twitter',
  instagram: '/channels/instagram',
};

interface ChannelStats {
  channel: string;
  publishedThisWeek: number;
}

export default function DashboardPage() {
  const { user } = useUser();
  const [channelStats, setChannelStats] = useState<ChannelStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const supabase = createClient();

      // Calculate date 7 days ago
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      // Fetch posts from last 7 days grouped by channel
      const { data, error } = await supabase
        .from('social_posts')
        .select('channel')
        .gte('created_at', weekAgo.toISOString());

      if (error) {
        console.error('Error fetching stats:', error);
        setLoading(false);
        return;
      }

      // Count posts per channel
      const counts: Record<string, number> = { linkedin: 0, x: 0, instagram: 0 };
      (data || []).forEach(post => {
        if (counts[post.channel] !== undefined) {
          counts[post.channel]++;
        }
      });

      setChannelStats([
        { channel: 'linkedin', publishedThisWeek: counts.linkedin },
        { channel: 'x', publishedThisWeek: counts.x },
        { channel: 'instagram', publishedThisWeek: counts.instagram },
      ]);
      setLoading(false);
    }

    fetchStats();
  }, []);

  const totalPublished = channelStats.reduce((sum, ch) => sum + ch.publishedThisWeek, 0);

  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className="flex flex-col h-full">
      <Header
        title={`Welcome back, ${firstName}!`}
        subtitle="Here's what's happening with your marketing content"
      />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-brand-neutral-100 border-brand-neutral-100">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-ice">
                  <TrendingUp className="h-6 w-6 text-brand-navy-600" />
                </div>
                <div>
                  {loading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-brand-navy-400" />
                  ) : (
                    <p className="text-2xl font-bold text-brand-navy-900">{totalPublished}</p>
                  )}
                  <p className="text-sm text-brand-navy-600">Published This Week</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Channel Cards */}
        <div>
          <h2 className="text-lg font-semibold mb-4 text-brand-navy-900">Channels</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {channelStats.map((stats) => {
              const Icon = channelIcons[stats.channel];
              const name = channelNames[stats.channel];
              const color = channelColors[stats.channel];
              const route = channelRoutes[stats.channel];

              return (
                <Card key={stats.channel} className="overflow-hidden border-brand-neutral-100">
                  <div className={`h-2 ${color}`} />
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color} text-white`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-base text-brand-navy-900">{name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-brand-navy-600">This week</span>
                        <span className="font-medium text-brand-navy-900">
                          {loading ? '-' : stats.publishedThisWeek}
                        </span>
                      </div>
                    </div>
                    <Link href={route}>
                      <Button variant="outline" className="w-full mt-4 gap-2 border-brand-navy-300 text-brand-navy-800 hover:bg-brand-neutral-100">
                        View Posts
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold mb-4 text-brand-navy-900">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/posting">
              <Card className="cursor-pointer transition-all hover:shadow-md hover:border-brand-brown/50 border-brand-neutral-100">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-navy-800 text-white">
                    <XIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-brand-navy-900">Post on X</h3>
                    <p className="text-sm text-brand-navy-600 mt-1">
                      Create and publish posts to X
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
