'use client';

import { useState, useRef, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Linkedin, Instagram, Send, Check, AlertCircle, Loader2, Image, X, Film, ExternalLink, MessageCircle, Repeat2, Quote, Heart, Link2, BarChart3, Eye, Trophy, Medal, Trash2, FileEdit, Clock, Zap, MonitorPlay } from 'lucide-react';
import { PlatformPreview } from '@/components/posts/PlatformPreview';
import { XIcon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';

type Channel = 'x' | 'linkedin' | 'instagram';
type PostType = 'tweet' | 'reply' | 'quote' | 'retweet' | 'like';
type LinkedInPostType = 'post' | 'repost' | 'comment' | 'like';
type PostRoute = 'direct' | 'proofreading' | 'scheduled';

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
  action_type?: string;
  target_url?: string;
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

interface LinkedInPostTypeConfig {
  id: LinkedInPostType;
  name: string;
  icon: React.ElementType;
  description: string;
  requiresContent: boolean;
  requiresPostUrl: boolean;
}

const linkedinPostTypes: LinkedInPostTypeConfig[] = [
  { id: 'post', name: 'Post', icon: Send, description: 'Create a new post', requiresContent: true, requiresPostUrl: false },
  { id: 'repost', name: 'Repost', icon: Repeat2, description: 'Share with optional commentary', requiresContent: false, requiresPostUrl: true },
  { id: 'comment', name: 'Comment', icon: MessageCircle, description: 'Comment on a post', requiresContent: true, requiresPostUrl: true },
  { id: 'like', name: 'Like', icon: Heart, description: 'Like a post', requiresContent: false, requiresPostUrl: true },
];

export default function PostingPage() {
  const [selectedChannel, setSelectedChannel] = useState<Channel>('x');
  const [selectedPostType, setSelectedPostType] = useState<PostType>('tweet');
  const [content, setContent] = useState('');
  const [tweetUrl, setTweetUrl] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaS3Url, setMediaS3Url] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; tweetId?: string; postUrl?: string } | null>(null);
  const [recentPosts, setRecentPosts] = useState<SocialPost[]>([]);
  const [allPosts, setAllPosts] = useState<SocialPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [linkedinConnected, setLinkedinConnected] = useState(false);
  const [linkedinName, setLinkedinName] = useState<string | null>(null);
  const [linkedinOrgName, setLinkedinOrgName] = useState<string | null>(null);
  const [linkedinConnectedBy, setLinkedinConnectedBy] = useState<string | null>(null);
  const [linkedinNeedsReconnect, setLinkedinNeedsReconnect] = useState(false);
  const [linkedinExpired, setLinkedinExpired] = useState(false);
  const [postMetrics, setPostMetrics] = useState<Record<string, {
    likes: number;
    retweets: number;
    replies: number;
    quotes: number;
    impressions?: number;
  }>>({});
  const [linkedinMetrics, setLinkedinMetrics] = useState<Record<string, {
    impressions: number;
    uniqueImpressions: number;
    clicks: number;
    likes: number;
    comments: number;
    shares: number;
  }>>({});
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<PostRoute>('direct');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [selectedLinkedInPostType, setSelectedLinkedInPostType] = useState<LinkedInPostType>('post');
  const [linkedinPostUrl, setLinkedinPostUrl] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ADMIN_EMAIL = 'othmane.zizi@meroka.com';

  const fetchRecentPosts = async () => {
    const supabase = createClient();

    // Fetch recent posts for activity feed (limited)
    const { data: recentData, error: recentError } = await supabase
      .from('social_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    // Fetch all posts for leaderboard (no limit)
    const { data: allData, error: allError } = await supabase
      .from('social_posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (!recentError && recentData) {
      setRecentPosts(recentData);
    }

    if (!allError && allData) {
      setAllPosts(allData);
      // Fetch metrics for ALL posts (for accurate leaderboard)
      const xPosts = allData.filter(p => p.channel === 'x' && p.external_id);
      if (xPosts.length > 0) {
        fetchMetrics(xPosts.map(p => p.external_id));
      }
      // Fetch metrics for ALL LinkedIn posts
      const linkedinPosts = allData.filter(p => p.channel === 'linkedin' && p.external_id);
      if (linkedinPosts.length > 0) {
        fetchLinkedInMetrics(linkedinPosts.map(p => p.external_id));
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

  const fetchLinkedInMetrics = async (postIds: string[]) => {
    if (postIds.length === 0) return;

    try {
      const response = await fetch(`/api/post/linkedin/metrics?ids=${postIds.join(',')}`);
      const data = await response.json();

      if (response.ok && data.metrics) {
        // Add empty metrics for posts not returned (new posts with no data)
        const metricsWithDefaults: typeof linkedinMetrics = {};
        for (const id of postIds) {
          metricsWithDefaults[id] = data.metrics[id] || {
            impressions: 0,
            uniqueImpressions: 0,
            clicks: 0,
            likes: 0,
            comments: 0,
            shares: 0,
          };
        }
        setLinkedinMetrics(metricsWithDefaults);
      } else {
        // On error, set empty metrics so UI doesn't stay stuck
        const emptyMetrics: typeof linkedinMetrics = {};
        for (const id of postIds) {
          emptyMetrics[id] = { impressions: 0, uniqueImpressions: 0, clicks: 0, likes: 0, comments: 0, shares: 0 };
        }
        setLinkedinMetrics(emptyMetrics);
      }
    } catch (error) {
      console.error('Error fetching LinkedIn metrics:', error);
      // Set empty metrics on error
      const emptyMetrics: typeof linkedinMetrics = {};
      for (const id of postIds) {
        emptyMetrics[id] = { impressions: 0, uniqueImpressions: 0, clicks: 0, likes: 0, comments: 0, shares: 0 };
      }
      setLinkedinMetrics(emptyMetrics);
    }
  };

  const fetchLinkedInStatus = async () => {
    try {
      const response = await fetch('/api/post/linkedin');
      const data = await response.json();
      setLinkedinConnected(data.connected);
      setLinkedinName(data.linkedinName || null);
      setLinkedinOrgName(data.organizationName || null);
      setLinkedinConnectedBy(data.connectedBy || null);
      setLinkedinNeedsReconnect(data.needsReconnect || false);
      setLinkedinExpired(data.isExpired || false);
    } catch (error) {
      console.error('Error fetching LinkedIn status:', error);
    }
  };

  const fetchCurrentUser = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserEmail(user?.email || null);
  };

  const deletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post from the activity log?')) {
      return;
    }

    setDeletingPostId(postId);
    try {
      const response = await fetch('/api/post/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      });

      if (response.ok) {
        setRecentPosts(posts => posts.filter(p => p.id !== postId));
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete post');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post');
    } finally {
      setDeletingPostId(null);
    }
  };

  useEffect(() => {
    fetchRecentPosts();
    fetchLinkedInStatus();
    fetchCurrentUser();
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

  // Extract LinkedIn post ID/URN from URL
  // LinkedIn URLs can be:
  // - https://www.linkedin.com/feed/update/urn:li:share:1234567890/
  // - https://www.linkedin.com/feed/update/urn:li:activity:1234567890/
  // - https://www.linkedin.com/posts/username_activity-1234567890-xxxx
  // - https://www.linkedin.com/posts/username_post-title-activity-1234567890-xxxx
  // Note: LinkedIn reshare API requires urn:li:share or urn:li:ugcPost, not activity
  const extractLinkedInPostId = (url: string): string | null => {
    // Match share or ugcPost URN-style URLs (these work directly)
    const shareMatch = url.match(/urn:li:(share|ugcPost):(\d+)/);
    if (shareMatch) {
      return `urn:li:${shareMatch[1]}:${shareMatch[2]}`;
    }
    // Match activity URN - convert to share (same ID works)
    const activityUrnMatch = url.match(/urn:li:activity:(\d+)/);
    if (activityUrnMatch) {
      return `urn:li:share:${activityUrnMatch[1]}`;
    }
    // Match posts-style URLs (activity ID anywhere in the URL) - use share URN
    const activityMatch = url.match(/activity-(\d+)/);
    if (activityMatch) {
      return `urn:li:share:${activityMatch[1]}`;
    }
    return null;
  };

  const tweetId = extractTweetId(tweetUrl);
  const linkedinPostUrn = extractLinkedInPostId(linkedinPostUrl);

  const needsTweetUrl = selectedChannel === 'x' && currentPostType.requiresTweetUrl;
  const currentLinkedInPostType = linkedinPostTypes.find(p => p.id === selectedLinkedInPostType)!;
  const needsLinkedInPostUrl = selectedChannel === 'linkedin' && currentLinkedInPostType.requiresPostUrl;
  const needsContent = (selectedChannel === 'linkedin' && currentLinkedInPostType.requiresContent) ||
                       (selectedChannel === 'x' && currentPostType.requiresContent);

  // For LinkedIn, check if connected
  const linkedinReady = selectedChannel !== 'linkedin' || linkedinConnected;

  const canPost = currentChannel.available &&
    linkedinReady &&
    (!needsContent || (content.trim().length > 0 && !isOverLimit)) &&
    (!needsTweetUrl || tweetId) &&
    (!needsLinkedInPostUrl || linkedinPostUrn);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime'];
    if (!validTypes.includes(file.type)) {
      setResult({
        success: false,
        message: 'Invalid file type. Use JPG, PNG, GIF, WebP, MP4, or MOV.',
      });
      return;
    }

    // Validate file size
    // Videos go directly to S3 - Twitter allows 512MB, LinkedIn allows 200MB
    // Images go through the API, limited to 5MB
    const isVideo = file.type.startsWith('video/');
    let maxSize: number;
    if (isVideo) {
      maxSize = selectedChannel === 'linkedin' ? 200 * 1024 * 1024 : 512 * 1024 * 1024;
    } else if (file.type.includes('gif')) {
      maxSize = 15 * 1024 * 1024;
    } else {
      maxSize = 5 * 1024 * 1024;
    }

    if (file.size > maxSize) {
      setResult({
        success: false,
        message: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max size: ${maxSize / 1024 / 1024}MB`,
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
    setMediaS3Url(null);
    setUploadProgress(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Upload video to S3 and return the URL
  const uploadToS3 = async (file: File): Promise<string> => {
    setUploadProgress('Getting upload URL...');

    // Get presigned URL
    const presignResponse = await fetch('/api/upload/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
      }),
    });

    if (!presignResponse.ok) {
      const error = await presignResponse.json();
      throw new Error(error.error || 'Failed to get upload URL');
    }

    const { presignedUrl, downloadUrl } = await presignResponse.json();

    setUploadProgress('Uploading video...');

    // Upload directly to S3
    const uploadResponse = await fetch(presignedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
      },
      body: file,
    });

    if (!uploadResponse.ok) {
      const text = await uploadResponse.text();
      console.error('S3 upload failed:', uploadResponse.status, text);
      throw new Error(`Failed to upload video to storage: ${uploadResponse.status}`);
    }

    setUploadProgress(null);
    return downloadUrl;
  };

  const handlePost = async () => {
    if (!canPost || isPosting) return;

    // Validate scheduled time if needed
    if (selectedRoute === 'scheduled' && (!scheduledDate || !scheduledTime)) {
      setResult({
        success: false,
        message: 'Please select a date and time for scheduling',
      });
      return;
    }

    setIsPosting(true);
    setResult(null);

    try {
      // Handle media upload first if needed (for proofreading/scheduled routes)
      let mediaUrl: string | null = null;
      let mediaType: string | null = null;

      if (mediaFile && selectedRoute !== 'direct') {
        const isVideo = mediaFile.type.startsWith('video/');
        if (isVideo) {
          try {
            setUploadProgress('Uploading video...');
            mediaUrl = await uploadToS3(mediaFile);
            mediaType = mediaFile.type;
          } catch (uploadError: any) {
            setResult({
              success: false,
              message: uploadError.message || 'Failed to upload video',
            });
            setIsPosting(false);
            setUploadProgress(null);
            return;
          }
        } else {
          // For images in non-direct routes, upload to S3 as well
          try {
            setUploadProgress('Uploading image...');
            mediaUrl = await uploadToS3(mediaFile);
            mediaType = mediaFile.type;
          } catch (uploadError: any) {
            setResult({
              success: false,
              message: uploadError.message || 'Failed to upload image',
            });
            setIsPosting(false);
            setUploadProgress(null);
            return;
          }
        }
      }

      // For proofreading or scheduled routes, create a draft
      if (selectedRoute !== 'direct') {
        const scheduledFor = selectedRoute === 'scheduled'
          ? new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString()
          : null;

        const response = await fetch('/api/drafts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: content.trim(),
            channel: selectedChannel,
            mediaUrl,
            mediaType,
            route: selectedRoute,
            scheduledFor,
            scheduledTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            actionType: selectedChannel === 'linkedin' ? selectedLinkedInPostType : selectedPostType,
            targetPostUrn: selectedChannel === 'linkedin' ? linkedinPostUrn : null,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          const routeMessages: Record<PostRoute, string> = {
            direct: '',
            proofreading: 'Sent to proofreading room!',
            scheduled: `Scheduled for ${scheduledDate} at ${scheduledTime}`,
          };
          setResult({
            success: true,
            message: routeMessages[selectedRoute],
          });
          setContent('');
          setScheduledDate('');
          setScheduledTime('');
          setLinkedinPostUrl('');
          removeMedia();
        } else {
          setResult({
            success: false,
            message: data.error || 'Failed to create draft',
          });
        }
        return;
      }

      // Direct posting - existing logic
      const formData = new FormData();

      if (selectedChannel === 'linkedin') {
        // LinkedIn posting
        formData.append('actionType', selectedLinkedInPostType);

        if (needsContent) {
          formData.append('content', content.trim());
        }

        if (needsLinkedInPostUrl && linkedinPostUrn) {
          formData.append('targetPostUrn', linkedinPostUrn);
        }

        // Only handle media for new posts (not repost/comment/like)
        if (mediaFile && selectedLinkedInPostType === 'post') {
          const isVideo = mediaFile.type.startsWith('video/');

          if (isVideo) {
            // For videos, upload to S3 first and pass the URL
            try {
              setUploadProgress('Uploading video...');
              const s3Url = await uploadToS3(mediaFile);
              formData.append('mediaUrl', s3Url);
              formData.append('mediaType', mediaFile.type);
            } catch (uploadError: any) {
              setResult({
                success: false,
                message: uploadError.message || 'Failed to upload video',
              });
              setIsPosting(false);
              setUploadProgress(null);
              return;
            }
          } else if (mediaFile.type.startsWith('image/')) {
            // For images, upload directly through the API
            formData.append('media', mediaFile);
          }
        }

        const response = await fetch('/api/post/linkedin', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (response.ok) {
          const actionMessages: Record<LinkedInPostType, string> = {
            post: 'Posted to LinkedIn successfully!',
            repost: 'Reposted successfully!',
            comment: 'Comment added successfully!',
            like: 'Liked successfully!',
          };
          setResult({
            success: true,
            message: actionMessages[selectedLinkedInPostType],
            postUrl: data.post?.url,
          });
          setContent('');
          setLinkedinPostUrl('');
          removeMedia();
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

        // Handle media upload
        if (mediaFile && selectedPostType === 'tweet') {
          const isVideo = mediaFile.type.startsWith('video/');

          if (isVideo) {
            // For videos, upload to S3 first and pass the URL
            try {
              setUploadProgress('Uploading video...');
              const s3Url = await uploadToS3(mediaFile);
              formData.append('mediaUrl', s3Url);
              formData.append('mediaType', mediaFile.type);
            } catch (uploadError: any) {
              setResult({
                success: false,
                message: uploadError.message || 'Failed to upload video',
              });
              setIsPosting(false);
              setUploadProgress(null);
              return;
            }
          } else {
            // For images, upload directly through the API
            formData.append('media', mediaFile);
          }
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
    } catch (error: any) {
      console.error('Post error:', error);
      setResult({
        success: false,
        message: error?.message || 'Network error. Please try again.',
      });
    } finally {
      setIsPosting(false);
      setUploadProgress(null);
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
          {selectedChannel === 'linkedin' && (!linkedinConnected || linkedinNeedsReconnect || linkedinExpired) && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="py-6">
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white">
                    <Linkedin className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-brand-navy-900">
                      {linkedinExpired ? 'LinkedIn Connection Expired' :
                       linkedinNeedsReconnect ? 'Reconnect LinkedIn' : 'Connect Company LinkedIn'}
                    </h3>
                    <p className="text-sm text-brand-navy-600 mt-1">
                      {linkedinExpired
                        ? 'The LinkedIn connection has expired. A page admin needs to reconnect.'
                        : linkedinNeedsReconnect
                        ? 'The LinkedIn connection needs to be updated for company page posting.'
                        : 'A page admin needs to connect the company LinkedIn page. All team members can then post.'}
                    </p>
                  </div>
                  <Button
                    onClick={() => window.location.href = '/api/auth/linkedin'}
                    className="gap-2 bg-blue-600 hover:bg-blue-700"
                  >
                    <Link2 className="h-4 w-4" />
                    {linkedinExpired || linkedinNeedsReconnect ? 'Reconnect LinkedIn' : 'Connect Company Page'}
                  </Button>
                  <p className="text-xs text-brand-navy-500">
                    Only page admins can connect. Once connected, everyone can post.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Post Route Selection - Only for tweet/LinkedIn, not interactions */}
          {(selectedChannel === 'linkedin' || (selectedChannel === 'x' && selectedPostType === 'tweet')) && (
            <Card className="border-brand-neutral-100">
              <CardHeader>
                <CardTitle className="text-brand-navy-900">Post Destination</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {/* Direct Post */}
                  <button
                    onClick={() => setSelectedRoute('direct')}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                      selectedRoute === 'direct'
                        ? "border-brand-brown bg-brand-brown/5"
                        : "border-brand-neutral-200 hover:border-brand-neutral-300"
                    )}
                  >
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full",
                      selectedRoute === 'direct' ? "bg-brand-brown text-white" : "bg-brand-neutral-100 text-brand-navy-600"
                    )}>
                      <Zap className="h-5 w-5" />
                    </div>
                    <span className={cn(
                      "font-medium text-sm",
                      selectedRoute === 'direct' ? "text-brand-brown" : "text-brand-navy-700"
                    )}>
                      Post Now
                    </span>
                    <span className="text-xs text-brand-navy-400 text-center">
                      Publish immediately
                    </span>
                  </button>

                  {/* Proofreading */}
                  <button
                    onClick={() => setSelectedRoute('proofreading')}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                      selectedRoute === 'proofreading'
                        ? "border-brand-brown bg-brand-brown/5"
                        : "border-brand-neutral-200 hover:border-brand-neutral-300"
                    )}
                  >
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full",
                      selectedRoute === 'proofreading' ? "bg-brand-brown text-white" : "bg-brand-neutral-100 text-brand-navy-600"
                    )}>
                      <FileEdit className="h-5 w-5" />
                    </div>
                    <span className={cn(
                      "font-medium text-sm",
                      selectedRoute === 'proofreading' ? "text-brand-brown" : "text-brand-navy-700"
                    )}>
                      Proofread
                    </span>
                    <span className="text-xs text-brand-navy-400 text-center">
                      Team review first
                    </span>
                  </button>

                  {/* Schedule */}
                  <button
                    onClick={() => setSelectedRoute('scheduled')}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                      selectedRoute === 'scheduled'
                        ? "border-brand-brown bg-brand-brown/5"
                        : "border-brand-neutral-200 hover:border-brand-neutral-300"
                    )}
                  >
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full",
                      selectedRoute === 'scheduled' ? "bg-brand-brown text-white" : "bg-brand-neutral-100 text-brand-navy-600"
                    )}>
                      <Clock className="h-5 w-5" />
                    </div>
                    <span className={cn(
                      "font-medium text-sm",
                      selectedRoute === 'scheduled' ? "text-brand-brown" : "text-brand-navy-700"
                    )}>
                      Schedule
                    </span>
                    <span className="text-xs text-brand-navy-400 text-center">
                      Post later
                    </span>
                  </button>
                </div>

                {/* Schedule picker */}
                {selectedRoute === 'scheduled' && (
                  <div className="mt-4 pt-4 border-t border-brand-neutral-100">
                    <p className="text-sm font-medium text-brand-navy-700 mb-3">Schedule for:</p>
                    <div className="flex gap-3">
                      <input
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="flex-1 px-3 py-2 text-sm border border-brand-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-brown/50"
                      />
                      <input
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="px-3 py-2 text-sm border border-brand-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-brown/50"
                      />
                    </div>
                    <p className="text-xs text-brand-navy-400 mt-2">
                      Time is in your local timezone
                    </p>
                  </div>
                )}
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

          {/* LinkedIn Action Type Selection */}
          {selectedChannel === 'linkedin' && linkedinConnected && (
            <Card className="border-brand-neutral-100">
              <CardHeader>
                <CardTitle className="text-brand-navy-900">Action Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {linkedinPostTypes.map((postType) => {
                    const Icon = postType.icon;
                    const isSelected = selectedLinkedInPostType === postType.id;

                    return (
                      <button
                        key={postType.id}
                        onClick={() => setSelectedLinkedInPostType(postType.id)}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all",
                          isSelected
                            ? "border-blue-600 bg-blue-50 text-blue-600"
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
                  {currentLinkedInPostType.description}
                </p>
                {selectedLinkedInPostType !== 'post' && (
                  <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Repost, Comment, and Like are pending API approval from LinkedIn.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Compose */}
          <Card className="border-brand-neutral-100">
            <CardHeader>
              <CardTitle className="text-brand-navy-900">
                {selectedChannel === 'linkedin' ? (
                  selectedLinkedInPostType === 'post' ? 'Compose Post' :
                  selectedLinkedInPostType === 'repost' ? 'Repost with Commentary' :
                  selectedLinkedInPostType === 'comment' ? 'Add Comment' : 'Like Post'
                ) : (
                  selectedPostType === 'tweet' ? 'Compose' :
                  selectedPostType === 'reply' ? 'Reply' :
                  selectedPostType === 'quote' ? 'Quote Tweet' :
                  selectedPostType === 'retweet' ? 'Retweet' : 'Like'
                )}
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

              {/* LinkedIn Post URL Input (for repost, comment, like) */}
              {needsLinkedInPostUrl && (
                <div>
                  <label className="block text-sm font-medium text-brand-navy-700 mb-2">
                    LinkedIn Post URL
                  </label>
                  <input
                    type="text"
                    value={linkedinPostUrl}
                    onChange={(e) => setLinkedinPostUrl(e.target.value)}
                    placeholder="https://www.linkedin.com/feed/update/urn:li:share:123456789/"
                    className={cn(
                      "w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2",
                      linkedinPostUrl && !linkedinPostUrn
                        ? "border-red-300 focus:ring-red-500/50"
                        : "border-brand-neutral-200 focus:ring-blue-500/50"
                    )}
                  />
                  {linkedinPostUrl && !linkedinPostUrn && (
                    <p className="text-sm text-red-500 mt-1">
                      Invalid LinkedIn post URL
                    </p>
                  )}
                  {linkedinPostUrn && (
                    <p className="text-sm text-green-600 mt-1">
                      Post URN: {linkedinPostUrn}
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

              {/* Media Preview (for tweets and LinkedIn) */}
              {(selectedPostType === 'tweet' || selectedChannel === 'linkedin') && mediaPreview && (
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

              {/* Media Upload Button (for tweets and LinkedIn) */}
              {(selectedPostType === 'tweet' || selectedChannel === 'linkedin') && (
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,.mov"
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
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                    showPreview
                      ? "bg-brand-brown text-white"
                      : "text-brand-navy-600 bg-brand-neutral-100 hover:bg-brand-neutral-200"
                  )}
                >
                  <MonitorPlay className="h-4 w-4" />
                  Preview
                </button>
                <span className="text-xs text-brand-navy-400">
                  {selectedChannel === 'linkedin' ? 'Images: 5MB max | Videos: 200MB' : 'Images: 5MB max | GIFs: 15MB | Videos: 512MB'}
                </span>
              </div>
              )}

              {/* Platform Preview */}
              {showPreview && needsContent && (
                <div className="p-4 bg-brand-neutral-50 rounded-xl">
                  <p className="text-sm font-medium text-brand-navy-700 mb-3">Preview</p>
                  <PlatformPreview
                    platform={selectedChannel as 'linkedin' | 'x'}
                    content={content}
                    mediaUrl={mediaPreview || undefined}
                    mediaType={mediaFile?.type.startsWith('video/') ? 'video' : 'image'}
                  />
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
                      {uploadProgress || (
                        selectedRoute === 'proofreading' ? 'Sending...' :
                        selectedRoute === 'scheduled' ? 'Scheduling...' :
                        selectedChannel === 'linkedin' ? (
                          selectedLinkedInPostType === 'like' ? 'Liking...' :
                          selectedLinkedInPostType === 'repost' ? 'Reposting...' :
                          selectedLinkedInPostType === 'comment' ? 'Commenting...' : 'Posting...'
                        ) :
                        selectedPostType === 'like' ? 'Liking...' :
                        selectedPostType === 'retweet' ? 'Retweeting...' : 'Posting...'
                      )}
                    </>
                  ) : (
                    <>
                      {/* Route-specific buttons for tweet/LinkedIn post (not interactions) */}
                      {((selectedChannel === 'linkedin' && selectedLinkedInPostType === 'post') || (selectedChannel === 'x' && selectedPostType === 'tweet')) && selectedRoute === 'proofreading' && (
                        <>
                          <FileEdit className="h-4 w-4" />
                          Send to Proofreading
                        </>
                      )}
                      {((selectedChannel === 'linkedin' && selectedLinkedInPostType === 'post') || (selectedChannel === 'x' && selectedPostType === 'tweet')) && selectedRoute === 'scheduled' && (
                        <>
                          <Clock className="h-4 w-4" />
                          Schedule Post
                        </>
                      )}
                      {/* Direct LinkedIn post */}
                      {selectedChannel === 'linkedin' && selectedLinkedInPostType === 'post' && selectedRoute === 'direct' && (
                        <>
                          <Linkedin className="h-4 w-4" />
                          Post to LinkedIn
                        </>
                      )}
                      {/* LinkedIn interactions */}
                      {selectedChannel === 'linkedin' && selectedLinkedInPostType !== 'post' && (
                        <>
                          {(() => {
                            const Icon = currentLinkedInPostType.icon;
                            return <Icon className="h-4 w-4" />;
                          })()}
                          {selectedLinkedInPostType === 'repost' && 'Repost'}
                          {selectedLinkedInPostType === 'comment' && 'Add Comment'}
                          {selectedLinkedInPostType === 'like' && 'Like Post'}
                        </>
                      )}
                      {/* Direct X tweet */}
                      {selectedChannel === 'x' && selectedPostType === 'tweet' && selectedRoute === 'direct' && (
                        <>
                          <Send className="h-4 w-4" />
                          Post to X
                        </>
                      )}
                      {/* X interactions (non-tweet) */}
                      {selectedChannel === 'x' && selectedPostType !== 'tweet' && (
                        <>
                          {(() => {
                            const Icon = currentPostType.icon;
                            return <Icon className="h-4 w-4" />;
                          })()}
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
              <CardTitle className="text-brand-navy-900">Recent Activity (All Platforms)</CardTitle>
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
                    const actionType = post.action_type || 'post';
                    const actionLabels: Record<string, { label: string; color: string; icon: React.ElementType }> = {
                      post: { label: 'Posted', color: 'bg-green-100 text-green-700', icon: Send },
                      comment: { label: 'Commented', color: 'bg-blue-100 text-blue-700', icon: MessageCircle },
                      repost: { label: 'Reposted', color: 'bg-purple-100 text-purple-700', icon: Repeat2 },
                      like: { label: 'Liked', color: 'bg-pink-100 text-pink-700', icon: Heart },
                    };
                    const actionInfo = actionLabels[actionType] || actionLabels.post;
                    const ActionIcon = actionInfo.icon;

                    return (
                      <div
                        key={post.id}
                        className="p-4 border border-brand-neutral-200 rounded-lg hover:border-brand-neutral-300 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            {/* Action type badge */}
                            <div className="flex items-center gap-2 mb-2">
                              <span className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                                actionInfo.color
                              )}>
                                <ActionIcon className="h-3 w-3" />
                                {actionInfo.label}
                              </span>
                              {post.target_url && (
                                <a
                                  href={post.target_url.startsWith('urn:') ? undefined : post.target_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-brand-navy-400 hover:text-brand-navy-600 truncate max-w-[200px]"
                                  title={post.target_url}
                                >
                                  {post.target_url.startsWith('urn:') ? 'Target post' : 'View original'}
                                </a>
                              )}
                            </div>
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

                            {/* Metrics for LinkedIn posts */}
                            {post.channel === 'linkedin' && (
                              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-brand-neutral-100">
                                {(() => {
                                  const liMetrics = post.external_id ? linkedinMetrics[post.external_id] : null;
                                  if (liMetrics) {
                                    return (
                                      <>
                                        <div className="flex items-center gap-1 text-xs text-brand-navy-500" title="Impressions">
                                          <Eye className="h-3.5 w-3.5" />
                                          <span>{liMetrics.impressions.toLocaleString()}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-brand-navy-500" title="Likes">
                                          <Heart className="h-3.5 w-3.5" />
                                          <span>{liMetrics.likes}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-brand-navy-500" title="Comments">
                                          <MessageCircle className="h-3.5 w-3.5" />
                                          <span>{liMetrics.comments}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-brand-navy-500" title="Shares">
                                          <Repeat2 className="h-3.5 w-3.5" />
                                          <span>{liMetrics.shares}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-brand-navy-500" title="Clicks">
                                          <BarChart3 className="h-3.5 w-3.5" />
                                          <span>{liMetrics.clicks}</span>
                                        </div>
                                      </>
                                    );
                                  }
                                  return (
                                    <span className="text-xs text-brand-navy-400">
                                      Metrics loading...
                                    </span>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                          <div className="flex-shrink-0 flex items-center gap-1">
                            {post.external_url && (
                              <a
                                href={post.external_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-brand-navy-500 hover:text-brand-brown hover:bg-brand-neutral-100 rounded-lg transition-colors"
                                title="View post"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                            {currentUserEmail === ADMIN_EMAIL && (
                              <button
                                onClick={() => deletePost(post.id)}
                                disabled={deletingPostId === post.id}
                                className="p-2 text-brand-navy-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                title="Delete from activity log"
                              >
                                {deletingPostId === post.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </button>
                            )}
                          </div>
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
                Leaderboard ({selectedChannel === 'x' ? 'X' : selectedChannel === 'linkedin' ? 'LinkedIn' : currentChannel.name})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                // Calculate leaderboard from ALL posts for the selected channel
                const channelPosts = allPosts.filter(p => p.channel === selectedChannel);

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

                  // Add metrics if available (use appropriate metrics based on channel)
                  if (post.external_id) {
                    if (selectedChannel === 'x' && postMetrics[post.external_id]) {
                      const metrics = postMetrics[post.external_id];
                      authorStats[key].impressions += metrics.impressions || 0;
                      authorStats[key].likes += metrics.likes || 0;
                    } else if (selectedChannel === 'linkedin' && linkedinMetrics[post.external_id]) {
                      const metrics = linkedinMetrics[post.external_id];
                      authorStats[key].impressions += metrics.impressions || 0;
                      authorStats[key].likes += metrics.likes || 0;
                    }
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
