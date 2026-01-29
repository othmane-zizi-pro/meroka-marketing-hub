'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Podium } from '@/components/posts/Podium';
import { EmployeePostCard } from '@/components/posts/EmployeePostCard';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/useUser';
import { Loader2, Filter } from 'lucide-react';
import { Channel } from '@/types';
import { cn } from '@/lib/utils';

const channelNames: Record<Channel, string> = {
  linkedin: 'LinkedIn',
  twitter: 'X',
  instagram: 'Instagram',
};

const channelDescriptions: Record<Channel, string> = {
  linkedin: 'AI-generated thought leadership posts',
  twitter: 'Quick updates, threads, and engagement with the tech community',
  instagram: 'Visual content showcasing company culture and behind-the-scenes',
};

interface Campaign {
  id: string;
  name: string;
  type: string;
}

interface Post {
  id: string;
  content: string;
  author_name: string;
  author_email: string;
  author_avatar?: string;
  likes_count: number;
  created_at: string;
  status: string;
  campaign_id: string;
  campaign_name: string;
}

interface Comment {
  id: string;
  post_id: string;
  user_email: string;
  user_name: string;
  content: string;
  created_at: string;
}

export default function ChannelPage() {
  const params = useParams();
  const channel = params.channel as Channel;
  const { user } = useUser();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const title = channelNames[channel] || 'Channel';
  const description = channelDescriptions[channel] || '';

  useEffect(() => {
    if (channel === 'linkedin') {
      fetchCampaignsAndPosts();
    } else {
      setLoading(false);
    }
  }, [channel, user?.email]);

  const fetchCampaignsAndPosts = async () => {
    const supabase = createClient();

    try {
      // First fetch all campaigns for this channel
      const { data: campaignsData } = await supabase
        .from('campaigns')
        .select('id, name, type')
        .order('name');

      setCampaigns(campaignsData || []);

      // Fetch all posts with campaign info
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          likes_count,
          created_at,
          status,
          author_id,
          campaign_id,
          campaigns (
            id,
            name,
            type
          )
        `)
        .order('created_at', { ascending: false });

      if (postsError) {
        console.error('Error fetching posts:', postsError);
        setLoading(false);
        return;
      }

      // Get user info for each post author
      const authorIds = Array.from(new Set(postsData?.map(p => p.author_id).filter(Boolean)));

      const { data: usersData } = await supabase
        .from('users')
        .select('id, name, email, settings')
        .in('id', authorIds);

      const userMap = new Map(usersData?.map(u => [u.id, u]) || []);

      // Transform posts with author info
      const transformedPosts: Post[] = (postsData || []).map(post => {
        const author = userMap.get(post.author_id);
        const campaign = post.campaigns as any;
        return {
          id: post.id,
          content: post.content,
          author_name: author?.name || 'Unknown',
          author_email: author?.email || '',
          author_avatar: undefined,
          likes_count: post.likes_count || 0,
          created_at: post.created_at,
          status: post.status,
          campaign_id: post.campaign_id,
          campaign_name: campaign?.name || 'Unknown Campaign',
        };
      });

      setPosts(transformedPosts);

      // Fetch all comments for these posts
      const postIds = transformedPosts.map(p => p.id);
      if (postIds.length > 0) {
        const { data: commentsData } = await supabase
          .from('post_comments')
          .select('*')
          .in('post_id', postIds)
          .order('created_at', { ascending: true });

        const commentsByPost: Record<string, Comment[]> = {};
        (commentsData || []).forEach(comment => {
          if (!commentsByPost[comment.post_id]) {
            commentsByPost[comment.post_id] = [];
          }
          commentsByPost[comment.post_id].push(comment);
        });
        setComments(commentsByPost);

        // Fetch user's likes
        if (user?.email) {
          const { data: likesData } = await supabase
            .from('post_likes')
            .select('post_id')
            .eq('user_email', user.email)
            .in('post_id', postIds);

          setUserLikes(new Set((likesData || []).map(l => l.post_id)));
        }
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLikeChange = (postId: string, liked: boolean, newCount: number) => {
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, likes_count: newCount } : p
    ));

    setUserLikes(prev => {
      const newSet = new Set(prev);
      if (liked) {
        newSet.add(postId);
      } else {
        newSet.delete(postId);
      }
      return newSet;
    });
  };

  const handleContentUpdate = (postId: string, newContent: string) => {
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, content: newContent } : p
    ));
  };

  // Filter posts by selected campaign
  const filteredPosts = selectedCampaign === 'all'
    ? posts
    : posts.filter(p => p.campaign_id === selectedCampaign);

  // Get top 3 posts by likes for podium (from filtered posts)
  const topPosts = [...filteredPosts]
    .sort((a, b) => b.likes_count - a.likes_count)
    .slice(0, 3);

  if (channel !== 'linkedin') {
    return (
      <div className="flex flex-col h-full">
        <Header title={title} subtitle={description} />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <p className="text-brand-navy-500">Coming soon</p>
            <p className="text-sm text-brand-navy-400 mt-1">This channel is not yet available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title={title} subtitle={description} />

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-brand-brown" />
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            {/* Campaign Filter */}
            {campaigns.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Filter className="h-4 w-4 text-brand-navy-500" />
                  <span className="text-sm font-medium text-brand-navy-700">Filter by Campaign</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCampaign('all')}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                      selectedCampaign === 'all'
                        ? "bg-brand-brown text-white"
                        : "bg-brand-neutral-100 text-brand-navy-700 hover:bg-brand-neutral-200"
                    )}
                  >
                    All Campaigns
                  </button>
                  {campaigns.map(campaign => (
                    <button
                      key={campaign.id}
                      onClick={() => setSelectedCampaign(campaign.id)}
                      className={cn(
                        "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                        selectedCampaign === campaign.id
                          ? "bg-brand-brown text-white"
                          : "bg-brand-neutral-100 text-brand-navy-700 hover:bg-brand-neutral-200"
                      )}
                    >
                      {campaign.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {filteredPosts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-brand-navy-500">No posts yet</p>
                <p className="text-sm text-brand-navy-400 mt-1">
                  Posts will appear here once the AI generates them
                </p>
              </div>
            ) : (
              <>
                {/* Podium for top 3 */}
                {topPosts.length >= 3 && (
                  <Podium posts={topPosts} />
                )}

                {/* Post feed */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-brand-navy-900">
                      {selectedCampaign === 'all' ? 'All Posts' : 'Campaign Posts'}
                    </h3>
                    <span className="text-sm text-brand-navy-500">
                      {filteredPosts.length} post{filteredPosts.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {filteredPosts.map(post => (
                    <EmployeePostCard
                      key={post.id}
                      post={post}
                      currentUserEmail={user?.email || ''}
                      initialLiked={userLikes.has(post.id)}
                      initialComments={comments[post.id] || []}
                      onLikeChange={handleLikeChange}
                      onContentUpdate={handleContentUpdate}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
