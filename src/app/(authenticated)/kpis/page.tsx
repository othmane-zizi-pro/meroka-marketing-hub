'use client';

import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  Heart,
  MessageCircle,
  Eye,
  Share2
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Hardcoded KPI data
const kpiData = {
  overview: {
    totalPosts: 47,
    totalPostsChange: 12,
    totalEngagement: 1243,
    totalEngagementChange: 8,
    avgLikesPerPost: 26.4,
    avgLikesChange: -3,
    activeEmployees: 10,
    activeEmployeesChange: 2,
  },
  weeklyStats: [
    { week: 'Week 1', posts: 8, likes: 156, comments: 42 },
    { week: 'Week 2', posts: 12, likes: 298, comments: 67 },
    { week: 'Week 3', posts: 15, likes: 412, comments: 89 },
    { week: 'Week 4', posts: 12, likes: 377, comments: 71 },
  ],
  topPerformingPosts: [
    { title: 'AI in Healthcare Innovation', author: 'Sarah Chen', likes: 89, comments: 23 },
    { title: 'Future of Remote Work', author: 'Michael Park', likes: 76, comments: 18 },
    { title: 'Sustainable Tech Practices', author: 'Emma Wilson', likes: 64, comments: 15 },
  ],
  channelBreakdown: {
    linkedin: { posts: 47, engagement: 1243, reach: 15600 },
    twitter: { posts: 0, engagement: 0, reach: 0 },
    instagram: { posts: 0, engagement: 0, reach: 0 },
  },
};

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
            value={kpiData.overview.totalPosts}
            change={kpiData.overview.totalPostsChange}
            icon={FileText}
          />
          <StatCard
            title="Total Engagement"
            value={kpiData.overview.totalEngagement.toLocaleString()}
            change={kpiData.overview.totalEngagementChange}
            icon={Heart}
            iconColor="text-red-500"
          />
          <StatCard
            title="Avg Likes/Post"
            value={kpiData.overview.avgLikesPerPost}
            change={kpiData.overview.avgLikesChange}
            icon={TrendingUp}
            iconColor="text-green-600"
          />
          <StatCard
            title="Active Employees"
            value={kpiData.overview.activeEmployees}
            change={kpiData.overview.activeEmployeesChange}
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-brand-neutral-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-brand-navy-600">Week</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-brand-navy-600">Posts</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-brand-navy-600">Likes</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-brand-navy-600">Comments</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-brand-navy-600">Engagement Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {kpiData.weeklyStats.map((week) => (
                    <tr key={week.week} className="border-b border-brand-neutral-100">
                      <td className="py-3 px-4 text-sm text-brand-navy-900">{week.week}</td>
                      <td className="py-3 px-4 text-sm text-brand-navy-700 text-right">{week.posts}</td>
                      <td className="py-3 px-4 text-sm text-brand-navy-700 text-right">{week.likes}</td>
                      <td className="py-3 px-4 text-sm text-brand-navy-700 text-right">{week.comments}</td>
                      <td className="py-3 px-4 text-sm text-brand-navy-700 text-right">
                        {((week.likes + week.comments) / week.posts).toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Performing Posts */}
          <Card className="border-brand-neutral-100">
            <CardHeader>
              <CardTitle className="text-brand-navy-900">Top Performing Posts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {kpiData.topPerformingPosts.map((post, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 rounded-lg bg-brand-neutral-50">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-brown text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-brand-navy-900 truncate">{post.title}</p>
                      <p className="text-xs text-brand-navy-500">by {post.author}</p>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-brand-navy-600">
                      <span className="flex items-center gap-1">
                        <Heart className="h-4 w-4" />
                        {post.likes}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-4 w-4" />
                        {post.comments}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Channel Breakdown */}
          <Card className="border-brand-neutral-100">
            <CardHeader>
              <CardTitle className="text-brand-navy-900">Channel Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(kpiData.channelBreakdown).map(([channel, stats]) => (
                  <div key={channel} className="p-4 rounded-lg bg-brand-neutral-50">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-brand-navy-900 capitalize">
                        {channel === 'twitter' ? 'X' : channel}
                      </span>
                      {stats.posts > 0 ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">Active</span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-full bg-brand-neutral-200 text-brand-navy-500">Coming Soon</span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-lg font-bold text-brand-navy-900">{stats.posts}</p>
                        <p className="text-xs text-brand-navy-500">Posts</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-brand-navy-900">{stats.engagement}</p>
                        <p className="text-xs text-brand-navy-500">Engagement</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-brand-navy-900">{stats.reach.toLocaleString()}</p>
                        <p className="text-xs text-brand-navy-500">Reach</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
