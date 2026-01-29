'use client';

import { useState } from 'react';
import { Heart, MessageCircle, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { formatDistanceToNow } from '@/lib/utils';

interface Comment {
  id: string;
  user_email: string;
  user_name: string;
  content: string;
  created_at: string;
}

interface EmployeePostCardProps {
  post: {
    id: string;
    content: string;
    author_name: string;
    author_email: string;
    author_avatar?: string;
    likes_count: number;
    created_at: string;
    status: string;
  };
  currentUserEmail: string;
  initialLiked?: boolean;
  initialComments?: Comment[];
  onLikeChange?: (postId: string, liked: boolean, newCount: number) => void;
}

export function EmployeePostCard({
  post,
  currentUserEmail,
  initialLiked = false,
  initialComments = [],
  onLikeChange,
}: EmployeePostCardProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [likeLoading, setLikeLoading] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  const handleLike = async () => {
    if (likeLoading) return;
    setLikeLoading(true);

    const supabase = createClient();
    const newLiked = !liked;

    try {
      if (newLiked) {
        await supabase.from('post_likes').insert({
          post_id: post.id,
          user_email: currentUserEmail,
        });
      } else {
        await supabase.from('post_likes').delete().match({
          post_id: post.id,
          user_email: currentUserEmail,
        });
      }

      const newCount = newLiked ? likesCount + 1 : likesCount - 1;
      setLiked(newLiked);
      setLikesCount(newCount);
      onLikeChange?.(post.id, newLiked, newCount);
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setLikeLoading(false);
    }
  };

  const handleComment = async () => {
    if (!newComment.trim() || commentLoading) return;
    setCommentLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || currentUserEmail.split('@')[0];

    try {
      const { data, error } = await supabase.from('post_comments').insert({
        post_id: post.id,
        user_email: currentUserEmail,
        user_name: userName,
        content: newComment.trim(),
      }).select().single();

      if (data && !error) {
        setComments([...comments, data]);
        setNewComment('');
      }
    } catch (error) {
      console.error('Error posting comment:', error);
    } finally {
      setCommentLoading(false);
    }
  };

  const statusBadge = {
    pending_review: { label: 'Pending Review', color: 'bg-yellow-100 text-yellow-800' },
    approved: { label: 'Approved', color: 'bg-green-100 text-green-800' },
    published: { label: 'Published', color: 'bg-blue-100 text-blue-800' },
    draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800' },
  }[post.status] || { label: post.status, color: 'bg-gray-100 text-gray-800' };

  return (
    <div className="bg-white rounded-xl border border-brand-neutral-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-brand-neutral-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar src={post.author_avatar} alt={post.author_name} size="md" />
            <div>
              <p className="font-medium text-brand-navy-900">{post.author_name}</p>
              <p className="text-xs text-brand-navy-400">
                {formatDistanceToNow(new Date(post.created_at))}
              </p>
            </div>
          </div>
          <span className={cn("px-2 py-1 rounded-full text-xs font-medium", statusBadge.color)}>
            {statusBadge.label}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-brand-navy-800 whitespace-pre-wrap">{post.content}</p>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-brand-neutral-100 flex items-center gap-4">
        <button
          onClick={handleLike}
          disabled={likeLoading}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors",
            liked
              ? "bg-red-50 text-red-600"
              : "hover:bg-brand-neutral-50 text-brand-navy-500"
          )}
        >
          <Heart className={cn("h-5 w-5", liked && "fill-current")} />
          <span className="font-medium">{likesCount}</span>
        </button>

        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-brand-neutral-50 text-brand-navy-500 transition-colors"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="font-medium">{comments.length}</span>
          {showComments ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="px-4 pb-4 border-t border-brand-neutral-100">
          {/* Comment list */}
          {comments.length > 0 && (
            <div className="pt-3 space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-2">
                  <Avatar alt={comment.user_name || 'User'} size="sm" />
                  <div className="flex-1 bg-brand-neutral-50 rounded-lg px-3 py-2">
                    <p className="text-sm font-medium text-brand-navy-900">
                      {comment.user_name}
                    </p>
                    <p className="text-sm text-brand-navy-700">{comment.content}</p>
                    <p className="text-xs text-brand-navy-400 mt-1">
                      {formatDistanceToNow(new Date(comment.created_at))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add comment */}
          <div className="flex gap-2 mt-3">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleComment()}
              placeholder="Add a comment..."
              className="flex-1 px-3 py-2 text-sm border border-brand-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-brown/50"
            />
            <Button
              onClick={handleComment}
              disabled={!newComment.trim() || commentLoading}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
