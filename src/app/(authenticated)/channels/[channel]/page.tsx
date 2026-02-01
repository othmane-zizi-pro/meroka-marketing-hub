'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Podium } from '@/components/posts/Podium';
import { PostModal } from '@/components/posts/PostModal';
import { EmployeePostCard } from '@/components/posts/EmployeePostCard';
import { ComposePostCard } from '@/components/posts/ComposePostCard';
import { RandomPostCard } from '@/components/posts/RandomPostCard';
import { GenerationProgressModal } from '@/components/posts/GenerationProgressModal';
import { createClient } from '@/lib/supabase/client';
import { SourceType } from '@/components/posts/PostBadges';
import { useUser } from '@/hooks/useUser';
import { Loader2, Filter, User, RefreshCw, Sparkles } from 'lucide-react';
import { Channel, GenerationMetadata } from '@/types';
import { cn } from '@/lib/utils';

const channelNames: Record<Channel, string> = {
  linkedin: 'LinkedIn',
  twitter: 'X',
  instagram: 'Instagram',
};

const channelDescriptions: Record<Channel, string> = {
  linkedin: 'Review and publish AI-generated campaign content',
  twitter: 'Review and publish AI-generated campaign content',
  instagram: 'Review and publish AI-generated campaign content',
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
  updated_at: string | null;
  status: string;
  campaign_id: string;
  campaign_name: string;
  source_type: SourceType;
  original_content: string | null;
  edit_distance: number | null;
}

interface Comment {
  id: string;
  post_id: string;
  user_email: string;
  user_name: string;
  content: string;
  created_at: string;
}

interface EditHistoryItem {
  id: string;
  editor_email: string;
  editor_name: string;
  previous_content: string;
  new_content: string;
  edit_summary: string | null;
  created_at: string;
}

interface InspirationPost {
  id: string;
  content: string;
  external_url: string | null;
  author_name: string;
  channel: string;
}

interface RandomPost {
  id: string;
  content: string;
  channel: string;
  status: string;
  current_content: string | null;
  created_at: string;
  updated_at: string | null;
  inspiration: InspirationPost | null;
  edit_history: EditHistoryItem[];
  media_url?: string;
  media_type?: string;
  generation_metadata?: GenerationMetadata | null;
}

export default function ChannelPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const channel = params.channel as Channel;
  const { user } = useUser();
  const campaignParam = searchParams.get('campaign');

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [initialCampaignSet, setInitialCampaignSet] = useState(false);
  const [selectedAuthor, setSelectedAuthor] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [posts, setPosts] = useState<Post[]>([]);
  const [randomPosts, setRandomPosts] = useState<RandomPost[]>([]);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [randomLoading, setRandomLoading] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [modalPost, setModalPost] = useState<Post | null>(null);
  const POSTS_PER_PAGE = 10;
  const ADMIN_EMAIL = 'othmane.zizi@meroka.com';

  const title = channelNames[channel] || 'Channel';
  const description = channelDescriptions[channel] || '';

  // Check if selected campaign is Random (check both type and name for robustness)
  const selectedCampaignData = campaigns.find(c => c.id === selectedCampaign);
  const isRandomCampaign = selectedCampaignData?.type === 'random' || selectedCampaignData?.name === 'Random';

  useEffect(() => {
    if (channel === 'linkedin' || channel === 'twitter') {
      fetchCampaignsAndPosts();
    } else {
      setLoading(false);
    }
  }, [channel, user?.email]);

  // Handle campaign query param (e.g., ?campaign=employee-voices)
  useEffect(() => {
    if (campaignParam === 'employee-voices' && campaigns.length > 0 && !initialCampaignSet) {
      const employeeVoicesCampaign = campaigns.find(c => c.name === 'Employee Voices');
      if (employeeVoicesCampaign) {
        setSelectedCampaign(employeeVoicesCampaign.id);
        setInitialCampaignSet(true);
      }
    }
  }, [campaignParam, campaigns, initialCampaignSet]);

  // Fetch random posts when Random campaign is selected OR when viewing All Campaigns
  useEffect(() => {
    if (isRandomCampaign || selectedCampaign === 'all') {
      fetchRandomPosts();
    }
  }, [selectedCampaign, isRandomCampaign]);

  const fetchCampaignsAndPosts = async () => {
    const supabase = createClient();

    try {
      // Map URL channel param to database platform
      const platformMap: Record<string, string> = {
        linkedin: 'linkedin',
        twitter: 'x',
        instagram: 'instagram',
      };
      const platform = platformMap[channel] || channel;

      // Get channel ID for filtering campaigns
      const { data: channelData, error: channelError } = await supabase
        .from('channels')
        .select('id')
        .eq('platform', platform)
        .single();

      if (channelError) {
        console.error('Error fetching channel:', channelError);
      }

      // First fetch all active campaigns for this channel
      let campaignsQuery = supabase
        .from('campaigns')
        .select('id, name, type')
        .eq('is_active', true)
        .order('name');

      // Filter by channel if we found one
      if (channelData?.id) {
        campaignsQuery = campaignsQuery.eq('channel_id', channelData.id);
      }

      const { data: campaignsData } = await campaignsQuery;

      setCampaigns(campaignsData || []);

      // If no campaigns for this channel, show empty state
      if (!campaignsData || campaignsData.length === 0) {
        setPosts([]);
        setLoading(false);
        return;
      }

      // Get non-random campaign IDs for fetching regular posts
      const nonRandomCampaignIds = campaignsData
        .filter(c => c.type !== 'random')
        .map(c => c.id);

      if (nonRandomCampaignIds.length === 0) {
        setPosts([]);
        setLoading(false);
        return;
      }

      // Fetch posts only from non-random campaigns
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          likes_count,
          created_at,
          updated_at,
          status,
          author_id,
          campaign_id,
          source_type,
          original_content,
          edit_distance,
          campaigns!inner (
            id,
            name,
            type,
            is_active
          )
        `)
        .in('campaign_id', nonRandomCampaignIds)
        .eq('campaigns.is_active', true)
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
          updated_at: post.updated_at,
          status: post.status,
          campaign_id: post.campaign_id,
          campaign_name: campaign?.name || 'Unknown Campaign',
          source_type: (post.source_type as SourceType) || 'ai_generated',
          original_content: post.original_content,
          edit_distance: post.edit_distance,
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

  const fetchRandomPosts = async () => {
    setRandomLoading(true);
    try {
      // Map channel to platform
      const platformMap: Record<string, string> = {
        linkedin: 'linkedin',
        twitter: 'x',
      };
      const platform = platformMap[channel] || channel;

      const response = await fetch(`/api/random/posts?channel=${platform}&status=pending_review`);
      const data = await response.json();

      if (response.ok) {
        setRandomPosts(data.posts || []);
      } else {
        console.error('Error fetching random posts:', data.error);
      }
    } catch (error) {
      console.error('Error fetching random posts:', error);
    } finally {
      setRandomLoading(false);
    }
  };

  const handleRandomEdit = async (postId: string, content: string, summary: string) => {
    const response = await fetch(`/api/drafts/${postId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, editSummary: summary }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to update post');
    }

    // Refresh random posts
    await fetchRandomPosts();
  };

  const handleRandomAction = async (postId: string, action: 'proofreading' | 'publish' | 'schedule', scheduledFor?: string) => {
    const response = await fetch(`/api/random/posts/${postId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, scheduledFor }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to perform action');
    }

    // Remove the post from the list
    setRandomPosts(posts => posts.filter(p => p.id !== postId));
  };

  const handleGeneratePosts = async () => {
    if (generateLoading) return;
    setGenerateLoading(true);
    setShowGenerateModal(true);
    try {
      const response = await fetch('/api/admin/generate-posts', {
        method: 'POST',
      });
      const data = await response.json();
      if (response.ok) {
        console.log('Generated posts:', data);
        // Refresh the posts list
        await fetchRandomPosts();
      } else {
        console.error('Failed to generate posts:', data.error);
      }
    } catch (error) {
      console.error('Error generating posts:', error);
    } finally {
      setGenerateLoading(false);
      setShowGenerateModal(false);
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

  const handleDelete = (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  // Check if Employee Voices campaign is selected
  const isEmployeeVoices = campaigns.find(c => c.id === selectedCampaign)?.name === 'Employee Voices';

  // Get Employee Voices campaign ID for filtering
  const employeeVoicesCampaignId = campaigns.find(c => c.name === 'Employee Voices')?.id;

  // Filter posts by selected campaign (for non-random campaigns)
  // When "All Campaigns" is selected, exclude Employee Voices posts (it has its own UI)
  const campaignFilteredPosts = selectedCampaign === 'all'
    ? posts.filter(p => p.campaign_id !== employeeVoicesCampaignId)
    : posts.filter(p => p.campaign_id === selectedCampaign);

  // Get unique authors for Employee Voices filter (sorted alphabetically)
  const getUniqueAuthors = () => {
    const authorMap = new Map<string, string>();
    campaignFilteredPosts.forEach(post => {
      if (!authorMap.has(post.author_email)) {
        authorMap.set(post.author_email, post.author_name);
      }
    });
    return Array.from(authorMap.entries())
      .map(([email, name]) => ({ email, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const uniqueAuthors = getUniqueAuthors();

  // Filter by author (only for Employee Voices)
  const filteredPosts = isEmployeeVoices && selectedAuthor !== 'all'
    ? campaignFilteredPosts.filter(p => p.author_email === selectedAuthor)
    : campaignFilteredPosts;

  // Pagination
  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);
  const paginatedPosts = filteredPosts.slice(
    (currentPage - 1) * POSTS_PER_PAGE,
    currentPage * POSTS_PER_PAGE
  );

  // Get top 3 posts by likes for podium (from campaign filtered posts, not author filtered)
  const topPosts = [...campaignFilteredPosts]
    .sort((a, b) => b.likes_count - a.likes_count)
    .slice(0, 3);

  if (channel !== 'linkedin' && channel !== 'twitter') {
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
                    onClick={() => {
                      setSelectedCampaign('all');
                      setSelectedAuthor('all');
                      setCurrentPage(1);
                    }}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                      selectedCampaign === 'all'
                        ? "bg-brand-brown text-white"
                        : "bg-brand-neutral-100 text-brand-navy-700 hover:bg-brand-neutral-200"
                    )}
                  >
                    All Campaigns
                  </button>
                  {[...campaigns]
                    .sort((a, b) => {
                      // Put Employee Voices (square corners) last
                      const aIsSpecial = a.name === 'Employee Voices';
                      const bIsSpecial = b.name === 'Employee Voices';
                      if (aIsSpecial && !bIsSpecial) return 1;
                      if (!aIsSpecial && bIsSpecial) return -1;
                      return 0;
                    })
                    .map(campaign => {
                    const isEmployeeVoicesCampaign = campaign.name === 'Employee Voices';
                    return (
                      <button
                        key={campaign.id}
                        onClick={() => {
                          setSelectedCampaign(campaign.id);
                          setSelectedAuthor('all');
                          setCurrentPage(1);
                        }}
                        className={cn(
                          "px-4 py-2 text-sm font-medium transition-colors",
                          isEmployeeVoicesCampaign ? "rounded-lg" : "rounded-full",
                          selectedCampaign === campaign.id
                            ? "bg-brand-brown text-white"
                            : "bg-brand-neutral-100 text-brand-navy-700 hover:bg-brand-neutral-200"
                        )}
                      >
                        {campaign.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Random Campaign Content - shown for All Campaigns or when Random is selected */}
            {(selectedCampaign === 'all' || isRandomCampaign) && (
              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-brand-navy-900">
                      AI-Generated Posts
                    </h3>
                    <p className="text-sm text-brand-navy-500 mt-1">
                      Review, edit, and publish AI-generated content
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Generate Posts Button - Admin only */}
                    {user?.email === ADMIN_EMAIL && (
                      <button
                        onClick={handleGeneratePosts}
                        disabled={generateLoading}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all disabled:opacity-50 shadow-sm"
                      >
                        <Sparkles className={cn("h-4 w-4", generateLoading && "animate-pulse")} />
                        {generateLoading ? 'Generating...' : 'Generate Posts'}
                      </button>
                    )}
                    <button
                      onClick={() => fetchRandomPosts()}
                      disabled={randomLoading}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-brand-navy-600 bg-brand-neutral-100 rounded-lg hover:bg-brand-neutral-200 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={cn("h-4 w-4", randomLoading && "animate-spin")} />
                      Refresh
                    </button>
                  </div>
                </div>

                {randomLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-brand-brown" />
                  </div>
                ) : randomPosts.length === 0 ? (
                  <div className="text-center py-12 bg-brand-neutral-50 rounded-xl">
                    <p className="text-brand-navy-500">No pending posts</p>
                    <p className="text-sm text-brand-navy-400 mt-1">
                      AI-generated posts will appear here when ready for review
                    </p>
                    <p className="text-xs text-brand-navy-400 mt-3">
                      New posts are generated hourly between 4 AM - 6 PM EST
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-brand-navy-500">
                      {randomPosts.length} pending post{randomPosts.length !== 1 ? 's' : ''}
                    </p>
                    {randomPosts.map((post) => (
                      <RandomPostCard
                        key={post.id}
                        post={post}
                        currentUserEmail={user?.email}
                        onEdit={handleRandomEdit}
                        onAction={handleRandomAction}
                      />
                    ))}
                  </>
                )}
              </div>
            )}

            {/* Regular Campaign Content - shown when not viewing only Random */}
            {!isRandomCampaign && (
              <>
                {/* Podium for top 3 - only for Employee Voices campaign */}
                {topPosts.length >= 3 && isEmployeeVoices && (
                  <Podium
                    posts={topPosts}
                    onPostClick={(podiumPost) => {
                      // Find the full post data
                      const fullPost = posts.find(p => p.id === podiumPost.id);
                      if (fullPost) setModalPost(fullPost);
                    }}
                  />
                )}

                {/* Compose Post Card - only show when a specific non-random campaign is selected */}
                {selectedCampaign !== 'all' && !isRandomCampaign && (
                  <ComposePostCard
                    campaignId={selectedCampaign}
                    campaignName={campaigns.find(c => c.id === selectedCampaign)?.name || 'Campaign'}
                    onPostCreated={fetchCampaignsAndPosts}
                  />
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
                    {/* Author filter - only for Employee Voices campaign */}
                    {isEmployeeVoices && uniqueAuthors.length > 1 && (
                      <div className="flex items-center gap-3 mb-4">
                        <User className="h-4 w-4 text-brand-navy-500" />
                        <span className="text-sm font-medium text-brand-navy-700">Filter by Employee:</span>
                        <select
                          value={selectedAuthor}
                          onChange={(e) => {
                            setSelectedAuthor(e.target.value);
                            setCurrentPage(1);
                          }}
                          className="px-3 py-2 text-sm font-medium border border-brand-neutral-200 rounded-lg bg-white text-brand-navy-600 focus:outline-none focus:ring-2 focus:ring-brand-brown/50"
                        >
                          <option value="all">All Employees</option>
                          {uniqueAuthors.map((author) => (
                            <option key={author.email} value={author.email}>
                              {author.name}
                            </option>
                          ))}
                        </select>
                      </div>
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
                      {paginatedPosts.map(post => (
                        <EmployeePostCard
                          key={post.id}
                          post={post}
                          currentUserEmail={user?.email || ''}
                          initialLiked={userLikes.has(post.id)}
                          initialComments={comments[post.id] || []}
                          onLikeChange={handleLikeChange}
                          onContentUpdate={handleContentUpdate}
                          onDelete={handleDelete}
                          sourceType={post.source_type}
                          isEdited={post.source_type === 'ai_generated' && (
                            (post.edit_distance !== null && post.edit_distance > 0) ||
                            (post.original_content !== null && post.content !== post.original_content)
                          )}
                        />
                      ))}

                      {/* Pagination Controls */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-6 border-t border-brand-neutral-100 mt-6">
                          <span className="text-sm text-brand-navy-500">
                            Showing {(currentPage - 1) * POSTS_PER_PAGE + 1}-{Math.min(currentPage * POSTS_PER_PAGE, filteredPosts.length)} of {filteredPosts.length} posts
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                              disabled={currentPage === 1}
                              className={cn(
                                "px-4 py-2 text-sm font-medium rounded-lg border transition-colors",
                                currentPage === 1
                                  ? "border-brand-neutral-200 text-brand-navy-300 cursor-not-allowed"
                                  : "border-brand-neutral-200 text-brand-navy-600 hover:bg-brand-neutral-50"
                              )}
                            >
                              Previous
                            </button>
                            <span className="text-sm text-brand-navy-600 px-2">
                              Page {currentPage} of {totalPages}
                            </span>
                            <button
                              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                              disabled={currentPage === totalPages}
                              className={cn(
                                "px-4 py-2 text-sm font-medium rounded-lg border transition-colors",
                                currentPage === totalPages
                                  ? "border-brand-neutral-200 text-brand-navy-300 cursor-not-allowed"
                                  : "border-brand-neutral-200 text-brand-navy-600 hover:bg-brand-neutral-50"
                              )}
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Post Modal */}
      {modalPost && (
        <PostModal
          post={modalPost}
          currentUserEmail={user?.email || ''}
          initialLiked={userLikes.has(modalPost.id)}
          initialComments={comments[modalPost.id] || []}
          onClose={() => setModalPost(null)}
          onLikeChange={handleLikeChange}
        />
      )}

      {/* Generation Progress Modal */}
      <GenerationProgressModal
        isOpen={showGenerateModal}
        onComplete={() => setShowGenerateModal(false)}
      />
    </div>
  );
}
