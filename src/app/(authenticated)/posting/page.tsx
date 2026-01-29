'use client';

import { useState, useRef, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Linkedin, Instagram, Send, Check, AlertCircle, Loader2, Image, X, Film, ExternalLink, MessageCircle, Repeat2, Quote, Heart, Link2, BarChart3, Eye, Trophy, Medal } from 'lucide-react';
import { XIcon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';

type Channel = 'x' | 'linkedin' | 'instagram';
type PostType = 'tweet' | 'reply' | 'quote' | 'retweet' | 'like';

interface ChannelConfig {
  id: Channel;
  name: string;
  icon: React.ElementType;
  maxLength: number;
  available: boolean;
  color: string;
}

const baseChannels: ChannelConfig[] = [
  { id: 'x', name: 'X', icon: XIcon, maxLength: 25000, available: true, color: 'bg-black' },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, maxLength: 3000, available: true, color: 'bg-blue-600' },
  { id: 'instagram', name: 'Instagram', icon: Instagram, maxLength: 2200, available: false, color: 'bg-gradient-to-br from-purple-600 to-pink-500' },
];

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

interface PostTypeConfig {
  id: PostType;
  name: string;
  icon: React.ElementType;
  description: string;
  requiresContent: boolean;
  requiresTweetUrl: boolean;
}

const postTypes: PostTypeConfig[] = [
  { id: 'tweet', name: 'Tweet', icon: Send, description: 'Post a new tweet', requiresContent: true, requiresTweetUrl: false },
  { id: 'reply', name: 'Reply', icon: MessageCircle, description: 'Reply to a tweet', requiresContent: true, requiresTweetUrl: true },
  { id: 'quote', name: 'Quote', icon: Quote, description: 'Quote tweet with comment', requiresContent: true, requiresTweetUrl: true },
  { id: 'retweet', name: 'Retweet', icon: Repeat2, description: 'Repost a tweet', requiresContent: false, requiresTweetUrl: true },
  { id: 'like', name: 'Like', icon: Heart, description: 'Like a tweet', requiresContent: false, requiresTweetUrl: true },
];

export default function PostingPage() {
  const [selectedChannel, setSelectedChannel] = useState<Channel>('x');
  const [selectedPostType, setSelectedPostType] = useState<PostType>('tweet');
  const [content, setContent] = useState('');
  const [tweetUrl, setTweetUrl] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; tweetId?: string; postUrl?: string } | null>(null);
  const [recentPosts, setRecentPosts] = useState<SocialPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [linkedinConnected, setLinkedinConnected] = useState(false);
  const [linkedinName, setLinkedinName] = useState<string | null>(null);
  const [linkedinOrgName, setLinkedinOrgName] = useState<string | null>(null);
  const [linkedinNeedsReconnect, setLinkedinNeedsReconnect] = useState(false);
  const [postMetrics, setPostMetrics] = useState<Record<string, {
    likes: number;
    retweets: number;
    replies: number;
    quotes: number;
    impressions?: number;
  }>>({});
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchRecentPosts = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('social_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setRecentPosts(data);
      // Fetch metrics for X posts
      const xPosts = data.filter(p => p.channel === 'x' && p.external_id);
      if (xPosts.length > 0) {
        fetchMetrics(xPosts.map(p => p.external_id));
      }
    }
    setLoadingPosts(false);
  };

  const fetchMetrics = async (tweetIds: string[]) => {
    if (tweetIds.length === 0) return;

    setLoadingMetrics(true);
    try {
      const response = await fetch(`/api/post/x/metrics?ids=${tweetIds.join(',')}`);
      const data = await response.json();

      if (response.ok && data.metrics) {
        setPostMetrics(data.metrics);
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoadingMetrics(false);
    }
  };

  const fetchLinkedInStatus = async () => {
    try {
      const response = await fetch('/api/post/linkedin');
      const data = await response.json();
      setLinkedinConnected(data.connected);
      setLinkedinName(data.linkedinName || null);
      setLinkedinOrgName(data.organizationName || null);
      setLinkedinNeedsReconnect(data.needsReconnect || false);
    } catch (error) {
      console.error('Error fetching LinkedIn status:', error);
    }
  };

  useEffect(() => {
    fetchRecentPosts();
    fetchLinkedInStatus();
  }, []);

  // Build channels array with dynamic LinkedIn availability
  const channels = baseChannels;

  const currentChannel = channels.find(c => c.id === selectedChannel)!;
  const currentPostType = postTypes.find(p => p.id === selectedPostType)!;
  const characterCount = content.length;
  const isOverLimit = characterCount > currentChannel.maxLength;

  // Extract tweet ID from URL
  const extractTweetId = (url: string): string | null => {
    const match = url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/);
    return match ? match[1] : null;
  };

  const tweetId = extractTweetId(tweetUrl);
  const needsTweetUrl = selectedChannel === 'x' && currentPostType.requiresTweetUrl;
  const needsContent = selectedChannel === 'linkedin' || currentPostType.requiresContent;

  // For LinkedIn, check if connected
  const linkedinReady = selectedChannel !== 'linkedin' || linkedinConnected;

  const canPost = currentChannel.available &&
    linkedinReady &&
    (!needsContent || (content.trim().length > 0 && !isOverLimit)) &&
    (!needsTweetUrl || tweetId);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4'];
    if (!validTypes.includes(file.type)) {
      setResult({
        success: false,
        message: 'Invalid file type. Use JPG, PNG, GIF, WebP, or MP4.',
      });
      return;
    }

    // Validate file size
    const maxSize = file.type.startsWith('video/') ? 512 * 1024 * 1024
      : file.type.includes('gif') ? 15 * 1024 * 1024
      : 5 * 1024 * 1024;

    if (file.size > maxSize) {
      setResult({
        success: false,
        message: `File too large. Max size: ${maxSize / 1024 / 1024}MB`,
      });
      return;
    }

    setMediaFile(file);
    setResult(null);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePost = async () => {
    if (!canPost || isPosting) return;

    setIsPosting(true);
    setResult(null);

    try {
      const formData = new FormData();

      if (selectedChannel === 'linkedin') {
        // LinkedIn posting
        formData.append('content', content.trim());

        const response = await fetch('/api/post/linkedin', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (response.ok) {
          setResult({
            success: true,
            message: 'Posted to LinkedIn successfully!',
            postUrl: data.post?.url,
          });
          setContent('');
          fetchRecentPosts();
        } else {
          setResult({
            success: false,
            message: data.error || 'Failed to post to LinkedIn',
          });
        }
      } else {
        // X (Twitter) posting
        formData.append('postType', selectedPostType);
        if (needsContent) {
          formData.append('content', content.trim());
        }
        if (needsTweetUrl && tweetId) {
          formData.append('tweetId', tweetId);
        }
        if (mediaFile && selectedPostType === 'tweet') {
          formData.append('media', mediaFile);
        }

        const response = await fetch('/api/post/x', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (response.ok) {
          const actionMessages: Record<PostType, string> = {
            tweet: 'Tweet posted successfully!',
            reply: 'Reply posted successfully!',
            quote: 'Quote tweet posted successfully!',
            retweet: 'Retweeted successfully!',
            like: 'Liked successfully!',
          };
          setResult({
            success: true,
            message: actionMessages[selectedPostType],
            tweetId: data.tweet?.id || data.result?.id,
          });
          setContent('');
          setTweetUrl('');
          removeMedia();
          fetchRecentPosts();
        } else {
          setResult({
            success: false,
            message: data.error || 'Failed to post',
          });
        }
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Network error. Please try again.',
      });
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Posting"
        subtitle="Publish content to social media channels"
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Channel Selection */}
          <Card className="border-brand-neutral-100">
            <CardHeader>
              <CardTitle className="text-brand-navy-900">Select Channel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                {channels.map((channel) => {
                  const Icon = channel.icon;
                  const isSelected = selectedChannel === channel.id;
                  const isLinkedinNotConnected = channel.id === 'linkedin' && !linkedinConnected;

                  return (
                    <button
                      key={channel.id}
                      onClick={() => channel.available && setSelectedChannel(channel.id)}
                      disabled={!channel.available}
                      className={cn(
                        "flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                        isSelected
                          ? "border-brand-brown bg-brand-brown/5"
                          : "border-brand-neutral-200 hover:border-brand-neutral-300",
                        !channel.available && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-full text-white",
                        channel.color
                      )}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className={cn(
                        "font-medium",
                        isSelected ? "text-brand-brown" : "text-brand-navy-700"
                      )}>
                        {channel.name}
                      </span>
                      {!channel.available && (
                        <span className="text-xs text-brand-navy-400">Coming soon</span>
                      )}
                      {channel.id === 'linkedin' && linkedinConnected && (
                        <span className="text-xs text-green-600 flex items-center gap-1">
                          <Check className="h-3 w-3" /> {linkedinOrgName || 'Connected'}
                        </span>
                      )}
                      {channel.id === 'linkedin' && linkedinNeedsReconnect && (
                        <span className="text-xs text-orange-500">Reconnect required</span>
                      )}
                      {isLinkedinNotConnected && !linkedinNeedsReconnect && (
                        <span className="text-xs text-brand-navy-400">Not connected</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* LinkedIn Connect Prompt */}
          {selectedChannel === 'linkedin' && (!linkedinConnected || linkedinNeedsReconnect) && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="py-6">
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white">
                    <Linkedin className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-brand-navy-900">
                      {linkedinNeedsReconnect ? 'Reconnect LinkedIn' : 'Connect LinkedIn'}
                    </h3>
                    <p className="text-sm text-brand-navy-600 mt-1">
                      {linkedinNeedsReconnect
                        ? 'Your LinkedIn connection needs to be updated to post as your company page'
                        : 'Connect your LinkedIn account to post as your company page'}
                    </p>
                  </div>
                  <Button
                    onClick={() => window.location.href = '/api/auth/linkedin'}
                    className="gap-2 bg-blue-600 hover:bg-blue-700"
                  >
                    <Link2 className="h-4 w-4" />
                    {linkedinNeedsReconnect ? 'Reconnect LinkedIn' : 'Connect LinkedIn Account'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Post Type Selection (only for X) */}
          {selectedChannel === 'x' && (
            <Card className="border-brand-neutral-100">
              <CardHeader>
                <CardTitle className="text-brand-navy-900">Action Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {postTypes.map((postType) => {
                    const Icon = postType.icon;
                    const isSelected = selectedPostType === postType.id;

                    return (
                      <button
                        key={postType.id}
                        onClick={() => setSelectedPostType(postType.id)}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all",
                          isSelected
                            ? "border-brand-brown bg-brand-brown/5 text-brand-brown"
                            : "border-brand-neutral-200 hover:border-brand-neutral-300 text-brand-navy-600"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="font-medium">{postType.name}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-sm text-brand-navy-500 mt-3">
                  {currentPostType.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Compose */}
          <Card className="border-brand-neutral-100">
            <CardHeader>
              <CardTitle className="text-brand-navy-900">
                {selectedChannel === 'linkedin' ? 'Compose Post' :
                 selectedPostType === 'tweet' ? 'Compose' :
                 selectedPostType === 'reply' ? 'Reply' :
                 selectedPostType === 'quote' ? 'Quote Tweet' :
                 selectedPostType === 'retweet' ? 'Retweet' : 'Like'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Tweet URL Input (for reply, quote, retweet, like) */}
              {needsTweetUrl && (
                <div>
                  <label className="block text-sm font-medium text-brand-navy-700 mb-2">
                    Tweet URL
                  </label>
                  <input
                    type="text"
                    value={tweetUrl}
                    onChange={(e) => setTweetUrl(e.target.value)}
                    placeholder="https://x.com/username/status/123456789"
                    className={cn(
                      "w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2",
                      tweetUrl && !tweetId
                        ? "border-red-300 focus:ring-red-500/50"
                        : "border-brand-neutral-200 focus:ring-brand-brown/50"
                    )}
                  />
                  {tweetUrl && !tweetId && (
                    <p className="text-sm text-red-500 mt-1">
                      Invalid tweet URL. Use format: https://x.com/username/status/123...
                    </p>
                  )}
                  {tweetId && (
                    <p className="text-sm text-green-600 mt-1">
                      Tweet ID: {tweetId}
                    </p>
                  )}
                </div>
              )}

              {/* Content textarea (not shown for retweet/like) */}
              {needsContent && (
              <div className="relative">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={`What's happening?`}
                  className={cn(
                    "w-full min-h-[150px] p-4 text-base border rounded-xl resize-none focus:outline-none focus:ring-2",
                    isOverLimit
                      ? "border-red-300 focus:ring-red-500/50"
                      : "border-brand-neutral-200 focus:ring-brand-brown/50"
                  )}
                />
                <div className={cn(
                  "absolute bottom-3 right-3 text-sm font-medium",
                  isOverLimit ? "text-red-500" : "text-brand-navy-400"
                )}>
                  {characterCount}/{currentChannel.maxLength}
                </div>
              </div>
              )}

              {/* Media Preview (only for tweets) */}
              {selectedPostType === 'tweet' && mediaPreview && (
                <div className="relative inline-block">
                  {mediaFile?.type.startsWith('video/') ? (
                    <video
                      src={mediaPreview}
                      className="max-h-64 rounded-lg border border-brand-neutral-200"
                      controls
                    />
                  ) : (
                    <img
                      src={mediaPreview}
                      alt="Preview"
                      className="max-h-64 rounded-lg border border-brand-neutral-200"
                    />
                  )}
                  <button
                    onClick={removeMedia}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Media Upload Button (only for tweets) */}
              {selectedPostType === 'tweet' && (
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,video/mp4"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand-navy-600 bg-brand-neutral-100 rounded-lg hover:bg-brand-neutral-200 transition-colors"
                >
                  <Image className="h-4 w-4" />
                  Add Image
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand-navy-600 bg-brand-neutral-100 rounded-lg hover:bg-brand-neutral-200 transition-colors"
                >
                  <Film className="h-4 w-4" />
                  Add Video
                </button>
                <span className="text-xs text-brand-navy-400">
                  Images: 5MB max | GIFs: 15MB | Videos: 512MB
                </span>
              </div>
              )}

              {/* Result message */}
              {result && (
                <div className={cn(
                  "flex items-center gap-2 p-3 rounded-lg",
                  result.success
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                )}>
                  {result.success ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <AlertCircle className="h-5 w-5" />
                  )}
                  <span>{result.message}</span>
                  {(result.tweetId || result.postUrl) && (
                    <a
                      href={result.postUrl || `https://x.com/i/status/${result.tweetId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto text-sm underline"
                    >
                      View post
                    </a>
                  )}
                </div>
              )}

              {/* Post button */}
              <div className="flex justify-end">
                <Button
                  onClick={handlePost}
                  disabled={!canPost || isPosting}
                  className="gap-2 px-6"
                >
                  {isPosting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {selectedChannel === 'linkedin' ? 'Posting...' :
                       selectedPostType === 'like' ? 'Liking...' :
                       selectedPostType === 'retweet' ? 'Retweeting...' : 'Posting...'}
                    </>
                  ) : (
                    <>
                      {selectedChannel === 'linkedin' ? (
                        <>
                          <Linkedin className="h-4 w-4" />
                          Post to LinkedIn
                        </>
                      ) : (
                        <>
                          {(() => {
                            const Icon = currentPostType.icon;
                            return <Icon className="h-4 w-4" />;
                          })()}
                          {selectedPostType === 'tweet' && `Post to ${currentChannel.name}`}
                          {selectedPostType === 'reply' && 'Send Reply'}
                          {selectedPostType === 'quote' && 'Post Quote'}
                          {selectedPostType === 'retweet' && 'Retweet'}
                          {selectedPostType === 'like' && 'Like Tweet'}
                        </>
                      )}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="border-brand-neutral-100">
            <CardHeader>
              <CardTitle className="text-brand-navy-900">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPosts ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-brand-brown" />
                </div>
              ) : recentPosts.length === 0 ? (
                <p className="text-brand-navy-500 text-center py-8">
                  No activity yet. Your posts will appear here.
                </p>
              ) : (
                <div className="space-y-4">
                  {recentPosts.map((post) => {
                    const metrics = post.channel === 'x' && post.external_id ? postMetrics[post.external_id] : null;

                    return (
                      <div
                        key={post.id}
                        className="p-4 border border-brand-neutral-200 rounded-lg hover:border-brand-neutral-300 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-brand-navy-800 whitespace-pre-wrap break-words">
                              {post.content}
                            </p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-brand-navy-500">
                              <div className="flex items-center gap-1">
                                {post.channel === 'x' && <XIcon className="h-3 w-3" />}
                                {post.channel === 'linkedin' && <Linkedin className="h-3 w-3" />}
                                {post.channel === 'instagram' && <Instagram className="h-3 w-3" />}
                                <span className="capitalize">{post.channel === 'x' ? 'X' : post.channel}</span>
                              </div>
                              <span>•</span>
                              <span>{post.author_name}</span>
                              <span>•</span>
                              <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                            </div>

                            {/* Metrics for X posts */}
                            {post.channel === 'x' && (
                              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-brand-neutral-100">
                                {loadingMetrics ? (
                                  <span className="text-xs text-brand-navy-400 flex items-center gap-1">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Loading metrics...
                                  </span>
                                ) : metrics ? (
                                  <>
                                    {metrics.impressions !== undefined && (
                                      <div className="flex items-center gap-1 text-xs text-brand-navy-500" title="Impressions">
                                        <Eye className="h-3.5 w-3.5" />
                                        <span>{metrics.impressions.toLocaleString()}</span>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-1 text-xs text-brand-navy-500" title="Likes">
                                      <Heart className="h-3.5 w-3.5" />
                                      <span>{metrics.likes}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-brand-navy-500" title="Retweets">
                                      <Repeat2 className="h-3.5 w-3.5" />
                                      <span>{metrics.retweets}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-brand-navy-500" title="Replies">
                                      <MessageCircle className="h-3.5 w-3.5" />
                                      <span>{metrics.replies}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-brand-navy-500" title="Quotes">
                                      <Quote className="h-3.5 w-3.5" />
                                      <span>{metrics.quotes}</span>
                                    </div>
                                  </>
                                ) : (
                                  <span className="text-xs text-brand-navy-400">
                                    Metrics unavailable
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          {post.external_url && (
                            <a
                              href={post.external_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-shrink-0 p-2 text-brand-navy-500 hover:text-brand-brown hover:bg-brand-neutral-100 rounded-lg transition-colors"
                              title="View post"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mini Leaderboard */}
          <Card className="border-brand-neutral-100">
            <CardHeader>
              <CardTitle className="text-brand-navy-900 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                // Calculate leaderboard from posts for the selected channel
                const channelPosts = recentPosts.filter(p => p.channel === selectedChannel);

                if (channelPosts.length === 0) {
                  return (
                    <p className="text-brand-navy-500 text-center py-4 text-sm">
                      No posts yet for {currentChannel.name}
                    </p>
                  );
                }

                // Aggregate by author
                const authorStats: Record<string, {
                  name: string;
                  posts: number;
                  impressions: number;
                  likes: number;
                }> = {};

                channelPosts.forEach(post => {
                  const key = post.author_email;
                  if (!authorStats[key]) {
                    authorStats[key] = {
                      name: post.author_name,
                      posts: 0,
                      impressions: 0,
                      likes: 0,
                    };
                  }
                  authorStats[key].posts += 1;

                  // Add metrics if available
                  if (post.external_id && postMetrics[post.external_id]) {
                    const metrics = postMetrics[post.external_id];
                    authorStats[key].impressions += metrics.impressions || 0;
                    authorStats[key].likes += metrics.likes || 0;
                  }
                });

                // Sort by impressions (or posts if no impressions)
                const leaderboard = Object.values(authorStats)
                  .sort((a, b) => {
                    if (b.impressions !== a.impressions) return b.impressions - a.impressions;
                    return b.posts - a.posts;
                  })
                  .slice(0, 5);

                const getMedalColor = (index: number) => {
                  if (index === 0) return 'text-yellow-500';
                  if (index === 1) return 'text-gray-400';
                  if (index === 2) return 'text-amber-600';
                  return 'text-brand-navy-400';
                };

                return (
                  <div className="space-y-3">
                    {leaderboard.map((author, index) => (
                      <div
                        key={author.name}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg",
                          index === 0 ? "bg-yellow-50 border border-yellow-200" : "bg-brand-neutral-50"
                        )}
                      >
                        <div className={cn("font-bold text-lg w-6", getMedalColor(index))}>
                          {index < 3 ? (
                            <Medal className="h-5 w-5" />
                          ) : (
                            <span className="text-sm">{index + 1}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-brand-navy-800 truncate">
                            {author.name}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-brand-navy-500">
                            <span>{author.posts} post{author.posts !== 1 ? 's' : ''}</span>
                            {author.impressions > 0 && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Eye className="h-3 w-3" />
                                  {author.impressions.toLocaleString()}
                                </span>
                              </>
                            )}
                            {author.likes > 0 && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Heart className="h-3 w-3" />
                                  {author.likes}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
