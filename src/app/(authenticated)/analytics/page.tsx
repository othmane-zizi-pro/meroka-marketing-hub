'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Users,
  FileText,
  TrendingUp,
  Linkedin,
  RefreshCw,
  Trophy,
  Medal,
  Send,
  Repeat2,
  Quote,
  ExternalLink,
  Activity,
} from 'lucide-react';
import { XIcon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

type TimePeriod = '7d' | '30d' | 'all';
type Platform = 'all' | 'x' | 'linkedin';

interface SummaryData {
  period: string;
  platform: string;
  combined: {
    posts: number;
    impressions: number;
    likes: number;
    comments: number;
    shares: number;
    engagement: number;
    engagementRate: number;
  };
  x: {
    posts: number;
    impressions: number;
    likes: number;
    comments: number;
    shares: number;
  };
  linkedin: {
    posts: number;
    impressions: number;
    likes: number;
    comments: number;
    shares: number;
  };
}

interface FollowerData {
  x: { followers: number; username: string } | null;
  linkedin: { followers: number; organizationName: string } | null;
  combined: number;
}

interface FollowerHistoryPoint {
  date: string;
  x?: number;
  linkedin?: number;
  total: number;
}

interface SocialPost {
  id: string;
  channel: string;
  content: string;
  external_id: string;
  external_url: string;
  author_name: string;
  author_email: string;
  created_at: string;
  action_type?: string;
  target_url?: string;
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

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<TimePeriod>('30d');
  const [platform, setPlatform] = useState<Platform>('all');
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [followers, setFollowers] = useState<FollowerData | null>(null);
  const [followerHistory, setFollowerHistory] = useState<FollowerHistoryPoint[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingFollowers, setLoadingFollowers] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [postMetrics, setPostMetrics] = useState<Record<string, XMetrics>>({});
  const [linkedinMetrics, setLinkedinMetrics] = useState<Record<string, LinkedInMetrics>>({});

  const fetchSummary = async () => {
    setLoadingSummary(true);
    try {
      const response = await fetch(`/api/analytics/summary?period=${period}&platform=${platform}`);
      if (response.ok) {
        const data = await response.json();
        setSummary(data);
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
    } finally {
      setLoadingSummary(false);
    }
  };

  const fetchFollowers = async () => {
    setLoadingFollowers(true);
    try {
      const response = await fetch('/api/analytics/followers');
      if (response.ok) {
        const data = await response.json();
        setFollowers(data);
      }
    } catch (error) {
      console.error('Error fetching followers:', error);
    } finally {
      setLoadingFollowers(false);
    }
  };

  const fetchFollowerHistory = async () => {
    setLoadingHistory(true);
    try {
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 365;
      const response = await fetch(`/api/analytics/followers/history?days=${days}`);
      if (response.ok) {
        const data = await response.json();
        setFollowerHistory(data.history || []);
      }
    } catch (error) {
      console.error('Error fetching follower history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

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
    fetchSummary();
    fetchFollowerHistory();
    fetchPosts();
  }, [period, platform]);

  useEffect(() => {
    fetchFollowers();
  }, []);

  const refreshAll = () => {
    fetchSummary();
    fetchFollowers();
    fetchFollowerHistory();
    fetchPosts();
  };

  // Format date for chart display
  const formatChartDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

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

  // Get display data based on selected platform
  const displayData = summary ? (
    platform === 'all' ? summary.combined :
    platform === 'x' ? { ...summary.x, engagement: summary.x.likes + summary.x.comments + summary.x.shares, engagementRate: summary.x.impressions > 0 ? ((summary.x.likes + summary.x.comments + summary.x.shares) / summary.x.impressions * 100) : 0 } :
    { ...summary.linkedin, engagement: summary.linkedin.likes + summary.linkedin.comments + summary.linkedin.shares, engagementRate: summary.linkedin.impressions > 0 ? ((summary.linkedin.likes + summary.linkedin.comments + summary.linkedin.shares) / summary.linkedin.impressions * 100) : 0 }
  ) : null;

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Analytics"
        subtitle="Track your social media performance across platforms"
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
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
              onClick={refreshAll}
              disabled={loadingSummary || loadingFollowers || loadingHistory || loadingPosts}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", (loadingSummary || loadingFollowers || loadingHistory || loadingPosts) && "animate-spin")} />
              Refresh
            </Button>
          </div>

          {/* Follower Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Combined Followers */}
            <Card className="border-brand-neutral-100">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-brand-navy-500">Total Followers</p>
                    {loadingFollowers ? (
                      <Loader2 className="h-6 w-6 animate-spin text-brand-brown mt-2" />
                    ) : (
                      <p className="text-3xl font-bold text-brand-navy-900 mt-1">
                        {formatNumber(followers?.combined || 0)}
                      </p>
                    )}
                  </div>
                  <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <Users className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* X Followers */}
            <Card className="border-brand-neutral-100">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-brand-navy-500 flex items-center gap-1.5">
                      <XIcon className="h-3.5 w-3.5" />
                      X Followers
                    </p>
                    {loadingFollowers ? (
                      <Loader2 className="h-6 w-6 animate-spin text-brand-brown mt-2" />
                    ) : (
                      <>
                        <p className="text-3xl font-bold text-brand-navy-900 mt-1">
                          {formatNumber(followers?.x?.followers || 0)}
                        </p>
                        {followers?.x?.username && (
                          <p className="text-xs text-brand-navy-400 mt-1">@{followers.x.username}</p>
                        )}
                      </>
                    )}
                  </div>
                  <div className="h-12 w-12 rounded-full bg-black flex items-center justify-center">
                    <XIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* LinkedIn Followers */}
            <Card className="border-brand-neutral-100">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-brand-navy-500 flex items-center gap-1.5">
                      <Linkedin className="h-3.5 w-3.5" />
                      LinkedIn Followers
                    </p>
                    {loadingFollowers ? (
                      <Loader2 className="h-6 w-6 animate-spin text-brand-brown mt-2" />
                    ) : (
                      <>
                        <p className="text-3xl font-bold text-brand-navy-900 mt-1">
                          {formatNumber(followers?.linkedin?.followers || 0)}
                        </p>
                        {followers?.linkedin?.organizationName && (
                          <p className="text-xs text-brand-navy-400 mt-1">{followers.linkedin.organizationName}</p>
                        )}
                      </>
                    )}
                  </div>
                  <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center">
                    <Linkedin className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Follower Growth Chart */}
          <Card className="border-brand-neutral-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-brand-brown" />
                Follower Growth
                <span className="text-sm font-normal text-brand-navy-500">
                  ({getPeriodLabel(period)})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-brand-brown" />
                </div>
              ) : followerHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-brand-navy-400">
                  <TrendingUp className="h-12 w-12 mb-3 opacity-50" />
                  <p className="text-sm">No historical data available yet.</p>
                  <p className="text-xs mt-1">Snapshots are taken automatically every day at midnight EST.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={followerHistory} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorX" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#000000" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#000000" stopOpacity={0.2}/>
                      </linearGradient>
                      <linearGradient id="colorLinkedin" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0A66C2" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#0A66C2" stopOpacity={0.2}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatChartDate}
                      stroke="#6B7280"
                      fontSize={12}
                    />
                    <YAxis
                      stroke="#6B7280"
                      fontSize={12}
                      tickFormatter={(value) => formatNumber(value)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(value, name) => [
                        formatNumber(Number(value) || 0),
                        name === 'x' ? 'X' : 'LinkedIn'
                      ]}
                      labelFormatter={(label) => formatChartDate(String(label))}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '12px' }}
                      formatter={(value) => value === 'x' ? 'X' : 'LinkedIn'}
                    />
                    {(platform === 'all' || platform === 'x') && (
                      <Area
                        type="monotone"
                        dataKey="x"
                        stackId="1"
                        stroke="#000000"
                        strokeWidth={2}
                        fill="url(#colorX)"
                      />
                    )}
                    {(platform === 'all' || platform === 'linkedin') && (
                      <Area
                        type="monotone"
                        dataKey="linkedin"
                        stackId="1"
                        stroke="#0A66C2"
                        strokeWidth={2}
                        fill="url(#colorLinkedin)"
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Period Label */}
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-brand-navy-900">
              Performance Metrics
            </h2>
            <span className="text-sm text-brand-navy-500">
              ({getPeriodLabel(period)}{platform !== 'all' ? ` · ${platform === 'x' ? 'X' : 'LinkedIn'}` : ''})
            </span>
          </div>

          {/* KPI Cards */}
          {loadingSummary ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-brand-brown" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {/* Posts */}
              <Card className="border-brand-neutral-100">
                <CardContent className="pt-6">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 text-brand-navy-500 mb-2">
                      <FileText className="h-4 w-4" />
                      <span className="text-xs font-medium">Posts</span>
                    </div>
                    <p className="text-2xl font-bold text-brand-navy-900">
                      {displayData?.posts || 0}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Impressions */}
              <Card className="border-brand-neutral-100">
                <CardContent className="pt-6">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 text-brand-navy-500 mb-2">
                      <Eye className="h-4 w-4" />
                      <span className="text-xs font-medium">Impressions</span>
                    </div>
                    <p className="text-2xl font-bold text-brand-navy-900">
                      {formatNumber(displayData?.impressions || 0)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Likes */}
              <Card className="border-brand-neutral-100">
                <CardContent className="pt-6">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 text-brand-navy-500 mb-2">
                      <Heart className="h-4 w-4" />
                      <span className="text-xs font-medium">Likes</span>
                    </div>
                    <p className="text-2xl font-bold text-brand-navy-900">
                      {formatNumber(displayData?.likes || 0)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Comments */}
              <Card className="border-brand-neutral-100">
                <CardContent className="pt-6">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 text-brand-navy-500 mb-2">
                      <MessageCircle className="h-4 w-4" />
                      <span className="text-xs font-medium">Comments</span>
                    </div>
                    <p className="text-2xl font-bold text-brand-navy-900">
                      {formatNumber(displayData?.comments || 0)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Shares */}
              <Card className="border-brand-neutral-100">
                <CardContent className="pt-6">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 text-brand-navy-500 mb-2">
                      <Share2 className="h-4 w-4" />
                      <span className="text-xs font-medium">Shares</span>
                    </div>
                    <p className="text-2xl font-bold text-brand-navy-900">
                      {formatNumber(displayData?.shares || 0)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Engagement Rate */}
              <Card className="border-brand-neutral-100">
                <CardContent className="pt-6">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 text-brand-navy-500 mb-2">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-xs font-medium">Eng. Rate</span>
                    </div>
                    <p className="text-2xl font-bold text-brand-navy-900">
                      {(displayData?.engagementRate || 0).toFixed(2)}%
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Platform Breakdown (only show when "All" is selected) */}
          {platform === 'all' && summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {/* X Breakdown */}
              <Card className="border-brand-neutral-100">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-black flex items-center justify-center">
                      <XIcon className="h-4 w-4 text-white" />
                    </div>
                    X Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-brand-navy-900">{summary.x.posts}</p>
                      <p className="text-xs text-brand-navy-500">Posts</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-brand-navy-900">{formatNumber(summary.x.impressions)}</p>
                      <p className="text-xs text-brand-navy-500">Impressions</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-brand-navy-900">{formatNumber(summary.x.likes + summary.x.comments + summary.x.shares)}</p>
                      <p className="text-xs text-brand-navy-500">Engagements</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* LinkedIn Breakdown */}
              <Card className="border-brand-neutral-100">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
                      <Linkedin className="h-4 w-4 text-white" />
                    </div>
                    LinkedIn Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-brand-navy-900">{summary.linkedin.posts}</p>
                      <p className="text-xs text-brand-navy-500">Posts</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-brand-navy-900">{formatNumber(summary.linkedin.impressions)}</p>
                      <p className="text-xs text-brand-navy-500">Impressions</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-brand-navy-900">{formatNumber(summary.linkedin.likes + summary.linkedin.comments + summary.linkedin.shares)}</p>
                      <p className="text-xs text-brand-navy-500">Engagements</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Activity Feed */}
          <Card className="border-brand-neutral-100 mt-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-5 w-5 text-brand-brown" />
                Recent Activity
                <span className="text-sm font-normal text-brand-navy-500">
                  ({getPeriodLabel(period)}{platform !== 'all' ? ` · ${platform === 'x' ? 'X' : 'LinkedIn'}` : ''})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPosts ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-brand-brown" />
                </div>
              ) : posts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-brand-navy-400">
                  <Activity className="h-12 w-12 mb-3 opacity-50" />
                  <p className="text-sm">No posts found for the selected filters.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  {posts.slice(0, 10).map((post) => {
                    const metrics = post.channel === 'x'
                      ? postMetrics[post.external_id]
                      : linkedinMetrics[post.external_id];
                    const impressions = post.channel === 'x'
                      ? (metrics as XMetrics)?.impressions
                      : (metrics as LinkedInMetrics)?.impressions;
                    const likes = post.channel === 'x'
                      ? (metrics as XMetrics)?.likes
                      : (metrics as LinkedInMetrics)?.likes;

                    // Determine action type badge
                    const actionType = post.action_type || 'posted';
                    const getActionBadge = () => {
                      switch (actionType) {
                        case 'comment':
                          return { icon: MessageCircle, label: 'Commented', color: 'bg-green-100 text-green-700' };
                        case 'repost':
                          return { icon: Repeat2, label: 'Reposted', color: 'bg-purple-100 text-purple-700' };
                        case 'quote':
                          return { icon: Quote, label: 'Quoted', color: 'bg-orange-100 text-orange-700' };
                        default:
                          return { icon: Send, label: 'Posted', color: 'bg-blue-100 text-blue-700' };
                      }
                    };
                    const badge = getActionBadge();
                    const BadgeIcon = badge.icon;

                    return (
                      <div
                        key={post.id}
                        className="flex items-start gap-3 p-3 rounded-lg border border-brand-neutral-100 hover:bg-brand-neutral-50 transition-colors"
                      >
                        {/* Platform Icon */}
                        <div className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
                          post.channel === 'x' ? "bg-black" : "bg-blue-600"
                        )}>
                          {post.channel === 'x' ? (
                            <XIcon className="h-4 w-4 text-white" />
                          ) : (
                            <Linkedin className="h-4 w-4 text-white" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            {/* Action Badge */}
                            <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", badge.color)}>
                              <BadgeIcon className="h-3 w-3" />
                              {badge.label}
                            </span>
                            <span className="text-sm font-medium text-brand-navy-900">{post.author_name}</span>
                            <span className="text-xs text-brand-navy-400">
                              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                            </span>
                          </div>

                          {/* Post Content Preview */}
                          <p className="text-sm text-brand-navy-600 line-clamp-3 mb-2">
                            {post.content}
                          </p>

                          {/* Metrics */}
                          <div className="flex items-center gap-4 text-xs text-brand-navy-500">
                            {impressions !== undefined && (
                              <span className="flex items-center gap-1">
                                <Eye className="h-3.5 w-3.5" />
                                {formatNumber(impressions)}
                              </span>
                            )}
                            {likes !== undefined && (
                              <span className="flex items-center gap-1">
                                <Heart className="h-3.5 w-3.5" />
                                {formatNumber(likes)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* External Link */}
                        {post.external_url && (
                          <a
                            href={post.external_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-shrink-0 p-2 rounded-md hover:bg-brand-neutral-100 text-brand-navy-400 hover:text-brand-navy-600 transition-colors"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Leaderboard */}
          <Card className="border-brand-neutral-100 mt-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-5 w-5 text-brand-brown" />
                Top Contributors
                <span className="text-sm font-normal text-brand-navy-500">
                  ({getPeriodLabel(period)}{platform !== 'all' ? ` · ${platform === 'x' ? 'X' : 'LinkedIn'}` : ''})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPosts ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-brand-brown" />
                </div>
              ) : posts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-brand-navy-400">
                  <Trophy className="h-12 w-12 mb-3 opacity-50" />
                  <p className="text-sm">No contributors found for the selected filters.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(() => {
                    // Calculate leaderboard from posts
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
                    const leaderboard = Array.from(contributorMap.values())
                      .sort((a, b) => {
                        if (b.totalImpressions !== a.totalImpressions) {
                          return b.totalImpressions - a.totalImpressions;
                        }
                        return b.postCount - a.postCount;
                      })
                      .slice(0, 5);

                    const getMedalIcon = (index: number) => {
                      if (index === 0) return <Medal className="h-5 w-5 text-yellow-500" />;
                      if (index === 1) return <Medal className="h-5 w-5 text-gray-400" />;
                      if (index === 2) return <Medal className="h-5 w-5 text-amber-600" />;
                      return <span className="w-5 h-5 flex items-center justify-center text-sm font-medium text-brand-navy-400">{index + 1}</span>;
                    };

                    return leaderboard.map((entry, index) => (
                      <div
                        key={entry.author_email}
                        className="flex items-center gap-3 p-3 rounded-lg border border-brand-neutral-100"
                      >
                        {/* Rank */}
                        <div className="flex-shrink-0 w-8 flex justify-center">
                          {getMedalIcon(index)}
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
                        <div className="flex items-center gap-4 text-sm">
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
                    ));
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
