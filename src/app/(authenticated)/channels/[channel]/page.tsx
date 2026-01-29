'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Podium } from '@/components/posts/Podium';
import { EmployeePostCard } from '@/components/posts/EmployeePostCard';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/useUser';
import { Loader2 } from 'lucide-react';
import { Channel } from '@/types';

const channelNames: Record<Channel, string> = {
  linkedin: 'LinkedIn',
  twitter: 'X',
  instagram: 'Instagram',
};

const channelDescriptions: Record<Channel, string> = {
  linkedin: 'Employee Voices - AI-generated thought leadership posts',
  twitter: 'Quick updates, threads, and engagement with the tech community',
  instagram: 'Visual content showcasing company culture and behind-the-scenes',
};

interface Post {
  id: string;
  content: string;
  author_name: string;
  author_email: string;
  author_avatar?: string;
  likes_count: number;
  created_at: string;
  status: string;
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

  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const title = channelNames[channel] || 'Channel';
  const description = channelDescriptions[channel] || '';

  useEffect(() => {
    if (channel === 'linkedin') {
      fetchEmployeeVoicesPosts();
    } else {
      setLoading(false);
    }
  }, [channel, user?.email]);

  const fetchEmployeeVoicesPosts = async () => {
    const supabase = createClient();

    try {
      // Fetch posts from Employee Voices campaign with author info
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          likes_count,
          created_at,
          status,
          author_id,
          campaigns!inner (
            id,
            name,
            type
          )
        `)
        .eq('campaigns.type', 'employee_voices')
        .order('created_at', { ascending: false });

      if (postsError) {
        console.error('Error fetching posts:', postsError);
        setLoading(false);
        return;
      }

      // Get employee info for each post
      const authorIds = Array.from(new Set(postsData?.map(p => p.author_id).filter(Boolean)));

      const { data: employeesData } = await supabase
        .from('employees')
        .select('id, name, email, settings')
        .in('id', authorIds);

      const employeeMap = new Map(employeesData?.map(e => [e.id, e]) || []);

      // Also get voice samples for avatars
      const emails = employeesData?.map(e => e.email) || [];
      const { data: voiceSamplesData } = await supabase
        .from('employee_voice_samples')
        .select('email')
        .in('email', emails);

      // Transform posts with author info
      const transformedPosts: Post[] = (postsData || []).map(post => {
        const employee = employeeMap.get(post.author_id);
        return {
          id: post.id,
          content: post.content,
          author_name: employee?.name || 'Unknown',
          author_email: employee?.email || '',
          author_avatar: undefined, // Could add avatar URL if stored
          likes_count: post.likes_count || 0,
          created_at: post.created_at,
          status: post.status,
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
    // Update local state
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

  // Get top 3 posts by likes for podium
  const topPosts = [...posts]
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
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-brand-navy-500">No posts yet</p>
            <p className="text-sm text-brand-navy-400 mt-1">
              Posts will appear here once the AI generates them
            </p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            {/* Podium for top 3 */}
            {topPosts.length >= 3 && (
              <Podium posts={topPosts} />
            )}

            {/* Post feed */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-brand-navy-900">Recent Posts</h3>
              {posts.map(post => (
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
          </div>
        )}
      </div>
    </div>
  );
}
