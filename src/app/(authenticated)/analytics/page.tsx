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
  Camera,
} from 'lucide-react';
import { XIcon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
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

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<TimePeriod>('30d');
  const [platform, setPlatform] = useState<Platform>('all');
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [followers, setFollowers] = useState<FollowerData | null>(null);
  const [followerHistory, setFollowerHistory] = useState<FollowerHistoryPoint[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingFollowers, setLoadingFollowers] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [takingSnapshot, setTakingSnapshot] = useState(false);

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

  const takeSnapshot = async () => {
    setTakingSnapshot(true);
    try {
      const response = await fetch('/api/analytics/followers/snapshot', { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        console.log('Snapshot taken:', data);
        // Refresh follower data after snapshot
        fetchFollowers();
        fetchFollowerHistory();
      }
    } catch (error) {
      console.error('Error taking snapshot:', error);
    } finally {
      setTakingSnapshot(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    fetchFollowerHistory();
  }, [period, platform]);

  useEffect(() => {
    fetchFollowers();
  }, []);

  const refreshAll = () => {
    fetchSummary();
    fetchFollowers();
    fetchFollowerHistory();
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

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={takeSnapshot}
                disabled={takingSnapshot}
              >
                <Camera className={cn("h-4 w-4 mr-2", takingSnapshot && "animate-pulse")} />
                {takingSnapshot ? 'Saving...' : 'Take Snapshot'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshAll}
                disabled={loadingSummary || loadingFollowers || loadingHistory}
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", (loadingSummary || loadingFollowers || loadingHistory) && "animate-spin")} />
                Refresh
              </Button>
            </div>
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
                  <Camera className="h-12 w-12 mb-3 opacity-50" />
                  <p className="text-sm">No historical data available yet.</p>
                  <p className="text-xs mt-1">Click &quot;Take Snapshot&quot; to start tracking follower growth.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={followerHistory} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
                        name === 'total' ? 'Total' : name === 'x' ? 'X' : 'LinkedIn'
                      ]}
                      labelFormatter={(label) => formatChartDate(String(label))}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '12px' }}
                      formatter={(value) => value === 'total' ? 'Total' : value === 'x' ? 'X' : 'LinkedIn'}
                    />
                    {platform === 'all' && (
                      <Line
                        type="monotone"
                        dataKey="total"
                        stroke="#8B5A2B"
                        strokeWidth={2}
                        dot={{ fill: '#8B5A2B', strokeWidth: 2, r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    )}
                    {(platform === 'all' || platform === 'x') && (
                      <Line
                        type="monotone"
                        dataKey="x"
                        stroke="#000000"
                        strokeWidth={2}
                        dot={{ fill: '#000000', strokeWidth: 2, r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    )}
                    {(platform === 'all' || platform === 'linkedin') && (
                      <Line
                        type="monotone"
                        dataKey="linkedin"
                        stroke="#0A66C2"
                        strokeWidth={2}
                        dot={{ fill: '#0A66C2', strokeWidth: 2, r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    )}
                  </LineChart>
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
        </div>
      </div>
    </div>
  );
}
