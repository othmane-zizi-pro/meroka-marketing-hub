'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  Heart,
  MessageCircle,
  Repeat2,
  Eye,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';

interface SocialPost {
  id: string;
  platform: string;
  action_type: string;
  content: string;
  external_id: string;
  author_name: string;
  author_email: string;
  created_at: string;
}

interface PostMetrics {
  likes: number;
  retweets: number;
  replies: number;
  quotes: number;
  impressions?: number;
}

interface TopPost {
  content: string;
  author: string;
  likes: number;
  retweets: number;
  impressions?: number;
}

interface WeeklyStats {
  week: string;
  posts: number;
  likes: number;
  retweets: number;
}

interface ChannelStats {
  posts: number;
  engagement: number;
  reach: number;
}

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
  iconColor?: string;
}

function StatCard({ title, value, change, icon: Icon, iconColor = 'text-brand-brown' }: StatCardProps) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <Card className="border-brand-neutral-100">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-brand-navy-600">{title}</p>
            <p className="text-2xl font-bold text-brand-navy-900 mt-1">{value}</p>
            {change !== undefined && (
              <div className={cn(
                "flex items-center gap-1 mt-2 text-sm",
                isPositive && "text-green-600",
                isNegative && "text-red-500",
                !isPositive && !isNegative && "text-brand-navy-500"
              )}>
                {isPositive && <TrendingUp className="h-4 w-4" />}
                {isNegative && <TrendingDown className="h-4 w-4" />}
                <span>{isPositive ? '+' : ''}{change}% vs last month</span>
              </div>
            )}
          </div>
          <div className={cn("p-3 rounded-lg bg-brand-neutral-100", iconColor)}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function KPIsPage() {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [metrics, setMetrics] = useState<Record<string, PostMetrics>>({});
  const [topPosts, setTopPosts] = useState<TopPost[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats[]>([]);
  const [channelStats, setChannelStats] = useState<Record<string, ChannelStats>>({
    x: { posts: 0, engagement: 0, reach: 0 },
    linkedin: { posts: 0, engagement: 0, reach: 0 },
    instagram: { posts: 0, engagement: 0, reach: 0 },
  });
  const [overviewStats, setOverviewStats] = useState({
    totalPosts: 0,
    totalEngagement: 0,
    avgEngagementPerPost: 0,
    activeEmployees: 0,
  });

  useEffect(() => {
    fetchKPIData();
  }, []);

  const fetchKPIData = async () => {
    const supabase = createClient();

    try {
      // Fetch all social posts (tweets only for now)
      const { data: postsData, error } = await supabase
        .from('social_posts')
        .select('*')
        .eq('action_type', 'tweet')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching posts:', error);
        setLoading(false);
        return;
      }

      const allPosts = postsData || [];
      setPosts(allPosts);

      // Get unique external IDs to fetch metrics
      const externalIds = allPosts
        .filter(p => p.external_id)
        .map(p => p.external_id);

      let metricsMap: Record<string, PostMetrics> = {};

      if (externalIds.length > 0) {
        // Fetch metrics from X API
        try {
          const response = await fetch(`/api/post/x/metrics?ids=${externalIds.join(',')}`);
          if (response.ok) {
            const data = await response.json();
            metricsMap = data.metrics || {};
          }
        } catch (err) {
          console.error('Error fetching metrics:', err);
        }
      }

      setMetrics(metricsMap);

      // Calculate top performing posts
      const postsWithMetrics = allPosts
        .filter(p => p.external_id && metricsMap[p.external_id])
        .map(p => ({
          content: p.content,
          author: p.author_name || 'Unknown',
          likes: metricsMap[p.external_id]?.likes || 0,
          retweets: metricsMap[p.external_id]?.retweets || 0,
          impressions: metricsMap[p.external_id]?.impressions,
        }))
        .sort((a, b) => (b.likes + b.retweets) - (a.likes + a.retweets))
        .slice(0, 5);

      setTopPosts(postsWithMetrics);

      // Calculate weekly stats (last 4 weeks)
      const weeks: WeeklyStats[] = [];
      for (let i = 3; i >= 0; i--) {
        const weekStart = startOfWeek(subDays(new Date(), i * 7));
        const weekEnd = endOfWeek(subDays(new Date(), i * 7));

        const weekPosts = allPosts.filter(p => {
          const postDate = new Date(p.created_at);
          return postDate >= weekStart && postDate <= weekEnd;
        });

        let weekLikes = 0;
        let weekRetweets = 0;

        weekPosts.forEach(p => {
          if (p.external_id && metricsMap[p.external_id]) {
            weekLikes += metricsMap[p.external_id].likes || 0;
            weekRetweets += metricsMap[p.external_id].retweets || 0;
          }
        });

        weeks.push({
          week: `Week ${4 - i}`,
          posts: weekPosts.length,
          likes: weekLikes,
          retweets: weekRetweets,
        });
      }

      setWeeklyStats(weeks);

      // Calculate channel stats
      const xPosts = allPosts.filter(p => p.platform === 'x');
      let xEngagement = 0;
      let xReach = 0;

      xPosts.forEach(p => {
        if (p.external_id && metricsMap[p.external_id]) {
          const m = metricsMap[p.external_id];
          xEngagement += (m.likes || 0) + (m.retweets || 0) + (m.replies || 0);
          xReach += m.impressions || 0;
        }
      });

      setChannelStats({
        x: { posts: xPosts.length, engagement: xEngagement, reach: xReach },
        linkedin: { posts: 0, engagement: 0, reach: 0 },
        instagram: { posts: 0, engagement: 0, reach: 0 },
      });

      // Calculate overview stats
      const uniqueAuthors = new Set(allPosts.map(p => p.author_email).filter(Boolean));
      let totalEngagement = 0;

      allPosts.forEach(p => {
        if (p.external_id && metricsMap[p.external_id]) {
          const m = metricsMap[p.external_id];
          totalEngagement += (m.likes || 0) + (m.retweets || 0) + (m.replies || 0);
        }
      });

      setOverviewStats({
        totalPosts: allPosts.length,
        totalEngagement,
        avgEngagementPerPost: allPosts.length > 0 ? Math.round((totalEngagement / allPosts.length) * 10) / 10 : 0,
        activeEmployees: uniqueAuthors.size,
      });

    } catch (error) {
      console.error('Error fetching KPI data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Truncate content for display
  const truncateContent = (content: string, maxLength: number = 50) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <Header
          title="KPIs"
          subtitle="Track your marketing performance metrics"
        />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-brown" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title="KPIs"
        subtitle="Track your marketing performance metrics"
      />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Posts"
            value={overviewStats.totalPosts}
            icon={FileText}
          />
          <StatCard
            title="Total Engagement"
            value={overviewStats.totalEngagement.toLocaleString()}
            icon={Heart}
            iconColor="text-red-500"
          />
          <StatCard
            title="Avg Engagement/Post"
            value={overviewStats.avgEngagementPerPost}
            icon={TrendingUp}
            iconColor="text-green-600"
          />
          <StatCard
            title="Active Employees"
            value={overviewStats.activeEmployees}
            icon={Users}
            iconColor="text-brand-navy-600"
          />
        </div>

        {/* Weekly Performance */}
        <Card className="border-brand-neutral-100">
          <CardHeader>
            <CardTitle className="text-brand-navy-900">Weekly Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {weeklyStats.some(w => w.posts > 0) ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-brand-neutral-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-brand-navy-600">Week</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-brand-navy-600">Posts</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-brand-navy-600">Likes</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-brand-navy-600">Retweets</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-brand-navy-600">Engagement Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeklyStats.map((week) => (
                      <tr key={week.week} className="border-b border-brand-neutral-100">
                        <td className="py-3 px-4 text-sm text-brand-navy-900">{week.week}</td>
                        <td className="py-3 px-4 text-sm text-brand-navy-700 text-right">{week.posts}</td>
                        <td className="py-3 px-4 text-sm text-brand-navy-700 text-right">{week.likes}</td>
                        <td className="py-3 px-4 text-sm text-brand-navy-700 text-right">{week.retweets}</td>
                        <td className="py-3 px-4 text-sm text-brand-navy-700 text-right">
                          {week.posts > 0 ? ((week.likes + week.retweets) / week.posts).toFixed(1) : '0'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-brand-navy-500">
                No posts yet. Start posting to see weekly performance data.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Performing Posts */}
          <Card className="border-brand-neutral-100">
            <CardHeader>
              <CardTitle className="text-brand-navy-900">Top Performing Posts</CardTitle>
            </CardHeader>
            <CardContent>
              {topPosts.length > 0 ? (
                <div className="space-y-4">
                  {topPosts.map((post, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 rounded-lg bg-brand-neutral-50">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-brown text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-brand-navy-900 truncate">
                          {truncateContent(post.content)}
                        </p>
                        <p className="text-xs text-brand-navy-500">by {post.author}</p>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-brand-navy-600">
                        <span className="flex items-center gap-1">
                          <Heart className="h-4 w-4" />
                          {post.likes}
                        </span>
                        <span className="flex items-center gap-1">
                          <Repeat2 className="h-4 w-4" />
                          {post.retweets}
                        </span>
                        {post.impressions !== undefined && (
                          <span className="flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            {post.impressions}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-brand-navy-500">
                  No posts with metrics yet. Post some content to see top performers.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Channel Breakdown */}
          <Card className="border-brand-neutral-100">
            <CardHeader>
              <CardTitle className="text-brand-navy-900">Channel Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* X (Twitter) */}
                <div className="p-4 rounded-lg bg-brand-neutral-50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-brand-navy-900">X</span>
                    {channelStats.x.posts > 0 ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">Active</span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full bg-brand-neutral-200 text-brand-navy-500">No Posts</span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-lg font-bold text-brand-navy-900">{channelStats.x.posts}</p>
                      <p className="text-xs text-brand-navy-500">Posts</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-brand-navy-900">{channelStats.x.engagement}</p>
                      <p className="text-xs text-brand-navy-500">Engagement</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-brand-navy-900">{channelStats.x.reach.toLocaleString()}</p>
                      <p className="text-xs text-brand-navy-500">Impressions</p>
                    </div>
                  </div>
                </div>

                {/* LinkedIn */}
                <div className="p-4 rounded-lg bg-brand-neutral-50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-brand-navy-900">LinkedIn</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-brand-neutral-200 text-brand-navy-500">Coming Soon</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-lg font-bold text-brand-navy-900">0</p>
                      <p className="text-xs text-brand-navy-500">Posts</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-brand-navy-900">0</p>
                      <p className="text-xs text-brand-navy-500">Engagement</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-brand-navy-900">0</p>
                      <p className="text-xs text-brand-navy-500">Reach</p>
                    </div>
                  </div>
                </div>

                {/* Instagram */}
                <div className="p-4 rounded-lg bg-brand-neutral-50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-brand-navy-900">Instagram</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-brand-neutral-200 text-brand-navy-500">Coming Soon</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-lg font-bold text-brand-navy-900">0</p>
                      <p className="text-xs text-brand-navy-500">Posts</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-brand-navy-900">0</p>
                      <p className="text-xs text-brand-navy-500">Engagement</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-brand-navy-900">0</p>
                      <p className="text-xs text-brand-navy-500">Reach</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
