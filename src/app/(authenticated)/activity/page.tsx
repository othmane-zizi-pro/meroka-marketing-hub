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
  Linkedin,
  RefreshCw,
  Send,
  Repeat2,
  Quote,
  ExternalLink,
  Activity,
  ChevronLeft,
  ChevronRight,
  Pencil,
  X,
  Check,
} from 'lucide-react';
import { XIcon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { useUser } from '@/hooks/useUser';

const ADMIN_EMAIL = 'othmane.zizi@meroka.com';

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

const POSTS_PER_PAGE = 10;

export default function ActivityPage() {
  const { user } = useUser();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const [period, setPeriod] = useState<TimePeriod>('30d');
  const [platform, setPlatform] = useState<Platform>('all');
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [postMetrics, setPostMetrics] = useState<Record<string, XMetrics>>({});
  const [linkedinMetrics, setLinkedinMetrics] = useState<Record<string, LinkedInMetrics>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingUrl, setEditingUrl] = useState('');
  const [savingUrl, setSavingUrl] = useState(false);

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

  const updatePostUrl = async (postId: string, newUrl: string) => {
    if (!isAdmin) return;

    setSavingUrl(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('social_posts')
        .update({ external_url: newUrl })
        .eq('id', postId);

      if (error) {
        console.error('Error updating post URL:', error);
        alert('Failed to update URL');
      } else {
        // Update local state
        setPosts(posts.map(p =>
          p.id === postId ? { ...p, external_url: newUrl } : p
        ));
        setEditingPostId(null);
        setEditingUrl('');
      }
    } catch (error) {
      console.error('Error updating post URL:', error);
      alert('Failed to update URL');
    } finally {
      setSavingUrl(false);
    }
  };

  const startEditing = (post: SocialPost) => {
    setEditingPostId(post.id);
    setEditingUrl(post.external_url || '');
  };

  const cancelEditing = () => {
    setEditingPostId(null);
    setEditingUrl('');
  };

  useEffect(() => {
    setCurrentPage(1);
    fetchPosts();
  }, [period, platform]);

  // Pagination calculations
  const totalPages = Math.ceil(posts.length / POSTS_PER_PAGE);
  const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
  const endIndex = startIndex + POSTS_PER_PAGE;
  const paginatedPosts = posts.slice(startIndex, endIndex);

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

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Activity Feed"
        subtitle="Recent posts across all platforms"
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

          {/* Activity Feed */}
          <Card className="border-brand-neutral-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-5 w-5 text-brand-brown" />
                Recent Activity
                <span className="text-sm font-normal text-brand-navy-500">
                  ({getPeriodLabel(period)}{platform !== 'all' ? ` - ${platform === 'x' ? 'X' : 'LinkedIn'}` : ''})
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
                <>
                <div className="space-y-3">
                  {paginatedPosts.map((post) => {
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
                        className="flex items-start gap-3 p-4 rounded-lg border border-brand-neutral-100 hover:bg-brand-neutral-50 transition-colors"
                      >
                        {/* Platform Icon */}
                        <div className={cn(
                          "h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0",
                          post.channel === 'x' ? "bg-black" : "bg-blue-600"
                        )}>
                          {post.channel === 'x' ? (
                            <XIcon className="h-5 w-5 text-white" />
                          ) : (
                            <Linkedin className="h-5 w-5 text-white" />
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

                        {/* External Link & Edit */}
                        <div className="flex-shrink-0 flex items-center gap-1">
                          {editingPostId === post.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editingUrl}
                                onChange={(e) => setEditingUrl(e.target.value)}
                                className="w-64 px-2 py-1 text-xs border border-brand-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-brown"
                                placeholder="Enter new URL"
                                autoFocus
                              />
                              <button
                                onClick={() => updatePostUrl(post.id, editingUrl)}
                                disabled={savingUrl}
                                className="p-1.5 rounded-md bg-green-100 text-green-700 hover:bg-green-200 transition-colors disabled:opacity-50"
                              >
                                {savingUrl ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                              </button>
                              <button
                                onClick={cancelEditing}
                                disabled={savingUrl}
                                className="p-1.5 rounded-md bg-red-100 text-red-700 hover:bg-red-200 transition-colors disabled:opacity-50"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <>
                              {isAdmin && (
                                <button
                                  onClick={() => startEditing(post)}
                                  className="p-2 rounded-md hover:bg-brand-neutral-100 text-brand-navy-400 hover:text-brand-navy-600 transition-colors"
                                  title="Edit URL"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                              )}
                              {post.external_url && (
                                <a
                                  href={post.external_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 rounded-md hover:bg-brand-neutral-100 text-brand-navy-400 hover:text-brand-navy-600 transition-colors"
                                  title="Open post"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t border-brand-neutral-100 mt-4">
                    <p className="text-sm text-brand-navy-500">
                      Showing {startIndex + 1}-{Math.min(endIndex, posts.length)} of {posts.length} posts
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      <span className="text-sm text-brand-navy-600 px-2">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
