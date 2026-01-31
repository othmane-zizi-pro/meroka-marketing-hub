'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  Eye,
  Heart,
  Linkedin,
  RefreshCw,
  Trophy,
  Medal,
} from 'lucide-react';
import { XIcon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

type TimePeriod = '7d' | '30d' | 'all';
type Platform = 'all' | 'x' | 'linkedin';

interface SocialPost {
  id: string;
  channel: string;
  content: string;
  external_id: string;
  external_url: string;
  author_name: string;
  author_email: string;
  created_at: string;
}

interface XMetrics {
  likes: number;
  retweets: number;
  replies: number;
  quotes: number;
  impressions?: number;
}

interface LinkedInMetrics {
  impressions: number;
  uniqueImpressions: number;
  clicks: number;
  likes: number;
  comments: number;
  shares: number;
}

interface LeaderboardEntry {
  author_name: string;
  author_email: string;
  postCount: number;
  totalImpressions: number;
  totalLikes: number;
}

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<TimePeriod>('30d');
  const [platform, setPlatform] = useState<Platform>('all');
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [postMetrics, setPostMetrics] = useState<Record<string, XMetrics>>({});
  const [linkedinMetrics, setLinkedinMetrics] = useState<Record<string, LinkedInMetrics>>({});

  const fetchPosts = async () => {
    setLoadingPosts(true);
    try {
      const supabase = createClient();

      // Calculate date filter
      let dateFilter: Date | null = null;
      if (period === '7d') {
        dateFilter = new Date();
        dateFilter.setDate(dateFilter.getDate() - 7);
      } else if (period === '30d') {
        dateFilter = new Date();
        dateFilter.setDate(dateFilter.getDate() - 30);
      }

      let query = supabase
        .from('social_posts')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply platform filter
      if (platform !== 'all') {
        query = query.eq('channel', platform);
      }

      // Apply date filter
      if (dateFilter) {
        query = query.gte('created_at', dateFilter.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching posts:', error);
        return;
      }

      setPosts(data || []);

      // Fetch metrics for X posts
      const xPosts = (data || []).filter(p => p.channel === 'x' && p.external_id);
      if (xPosts.length > 0) {
        fetchXMetrics(xPosts.map(p => p.external_id));
      }

      // Fetch metrics for LinkedIn posts
      const linkedinPosts = (data || []).filter(p => p.channel === 'linkedin' && p.external_id);
      if (linkedinPosts.length > 0) {
        fetchLinkedInMetrics(linkedinPosts.map(p => p.external_id));
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoadingPosts(false);
    }
  };

  const fetchXMetrics = async (ids: string[]) => {
    try {
      const response = await fetch(`/api/post/x/metrics?ids=${ids.join(',')}`);
      if (response.ok) {
        const data = await response.json();
        setPostMetrics(data.metrics || {});
      }
    } catch (error) {
      console.error('Error fetching X metrics:', error);
    }
  };

  const fetchLinkedInMetrics = async (ids: string[]) => {
    try {
      const response = await fetch(`/api/post/linkedin/metrics?ids=${ids.join(',')}`);
      if (response.ok) {
        const data = await response.json();
        setLinkedinMetrics(data.metrics || {});
      }
    } catch (error) {
      console.error('Error fetching LinkedIn metrics:', error);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [period, platform]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const getPeriodLabel = (p: TimePeriod) => {
    switch (p) {
      case '7d': return 'Last 7 Days';
      case '30d': return 'Last 30 Days';
      case 'all': return 'All Time';
    }
  };

  // Calculate leaderboard from posts
  const calculateLeaderboard = (): LeaderboardEntry[] => {
    const contributorMap = new Map<string, LeaderboardEntry>();

    posts.forEach((post) => {
      const key = post.author_email;
      const existing = contributorMap.get(key);

      const metrics = post.channel === 'x'
        ? postMetrics[post.external_id]
        : linkedinMetrics[post.external_id];
      const impressions = post.channel === 'x'
        ? (metrics as XMetrics)?.impressions || 0
        : (metrics as LinkedInMetrics)?.impressions || 0;
      const likes = post.channel === 'x'
        ? (metrics as XMetrics)?.likes || 0
        : (metrics as LinkedInMetrics)?.likes || 0;

      if (existing) {
        existing.postCount++;
        existing.totalImpressions += impressions;
        existing.totalLikes += likes;
      } else {
        contributorMap.set(key, {
          author_name: post.author_name,
          author_email: post.author_email,
          postCount: 1,
          totalImpressions: impressions,
          totalLikes: likes,
        });
      }
    });

    // Sort by impressions (primary), post count (secondary)
    return Array.from(contributorMap.values())
      .sort((a, b) => {
        if (b.totalImpressions !== a.totalImpressions) {
          return b.totalImpressions - a.totalImpressions;
        }
        return b.postCount - a.postCount;
      });
  };

  const leaderboard = calculateLeaderboard();

  const getMedalColor = (index: number) => {
    if (index === 0) return 'text-yellow-500';
    if (index === 1) return 'text-gray-400';
    if (index === 2) return 'text-amber-600';
    return 'text-brand-navy-400';
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Leaderboard"
        subtitle="Top contributors ranked by performance"
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Time Period Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-brand-navy-600">Period:</span>
              <div className="flex rounded-lg border border-brand-neutral-200 overflow-hidden">
                {(['7d', '30d', 'all'] as TimePeriod[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={cn(
                      "px-4 py-2 text-sm font-medium transition-colors",
                      period === p
                        ? "bg-brand-brown text-white"
                        : "bg-white text-brand-navy-600 hover:bg-brand-neutral-50"
                    )}
                  >
                    {p === '7d' ? '7D' : p === '30d' ? '30D' : 'All'}
                  </button>
                ))}
              </div>
            </div>

            {/* Platform Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-brand-navy-600">Platform:</span>
              <div className="flex rounded-lg border border-brand-neutral-200 overflow-hidden">
                <button
                  onClick={() => setPlatform('all')}
                  className={cn(
                    "px-4 py-2 text-sm font-medium transition-colors",
                    platform === 'all'
                      ? "bg-brand-brown text-white"
                      : "bg-white text-brand-navy-600 hover:bg-brand-neutral-50"
                  )}
                >
                  All
                </button>
                <button
                  onClick={() => setPlatform('x')}
                  className={cn(
                    "px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1.5",
                    platform === 'x'
                      ? "bg-black text-white"
                      : "bg-white text-brand-navy-600 hover:bg-brand-neutral-50"
                  )}
                >
                  <XIcon className="h-3.5 w-3.5" />
                  X
                </button>
                <button
                  onClick={() => setPlatform('linkedin')}
                  className={cn(
                    "px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1.5",
                    platform === 'linkedin'
                      ? "bg-blue-600 text-white"
                      : "bg-white text-brand-navy-600 hover:bg-brand-neutral-50"
                  )}
                >
                  <Linkedin className="h-3.5 w-3.5" />
                  LinkedIn
                </button>
              </div>
            </div>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchPosts}
              disabled={loadingPosts}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", loadingPosts && "animate-spin")} />
              Refresh
            </Button>
          </div>

          {loadingPosts ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-brand-brown" />
            </div>
          ) : leaderboard.length === 0 ? (
            <Card className="border-brand-neutral-100">
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center text-brand-navy-400">
                  <Trophy className="h-12 w-12 mb-3 opacity-50" />
                  <p className="text-sm">No contributors found for the selected filters.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-brand-neutral-100">
              <CardHeader>
                <CardTitle className="text-brand-navy-900 flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-brand-brown" />
                  Top Contributors
                  <span className="text-sm font-normal text-brand-navy-500">
                    ({getPeriodLabel(period)}{platform !== 'all' ? ` - ${platform === 'x' ? 'X' : 'LinkedIn'}` : ''})
                  </span>
                </CardTitle>
              </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {leaderboard.map((entry, index) => (
                      <div
                        key={entry.author_email}
                        className="flex items-center gap-3 p-3 rounded-lg border border-brand-neutral-100 hover:bg-brand-neutral-50 transition-colors"
                      >
                        {/* Rank */}
                        <div className="flex-shrink-0 w-10 flex justify-center">
                          {index < 3 ? (
                            <Medal className={cn("h-6 w-6", getMedalColor(index))} />
                          ) : (
                            <span className="w-6 h-6 flex items-center justify-center text-sm font-medium text-brand-navy-400">
                              {index + 1}
                            </span>
                          )}
                        </div>

                        {/* Author Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-brand-navy-900 truncate">
                            {entry.author_name}
                          </p>
                          <p className="text-xs text-brand-navy-400">
                            {entry.postCount} {entry.postCount === 1 ? 'post' : 'posts'}
                          </p>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-6 text-sm">
                          <div className="text-right">
                            <p className="font-semibold text-brand-navy-900">{formatNumber(entry.totalImpressions)}</p>
                            <p className="text-xs text-brand-navy-400">impressions</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-brand-navy-900">{formatNumber(entry.totalLikes)}</p>
                            <p className="text-xs text-brand-navy-400">likes</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
