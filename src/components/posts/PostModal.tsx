'use client';

import { useEffect, useState } from 'react';
import { X, Heart, MessageCircle, Send, ChevronDown, ChevronUp } from 'lucide-react';
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

interface PostModalProps {
  post: {
    id: string;
    content: string;
    author_name: string;
    author_email: string;
    likes_count: number;
    created_at?: string;
  };
  currentUserEmail: string;
  initialLiked?: boolean;
  initialComments?: Comment[];
  onClose: () => void;
  onLikeChange?: (postId: string, liked: boolean, newCount: number) => void;
}

export function PostModal({
  post,
  currentUserEmail,
  initialLiked = false,
  initialComments = [],
  onClose,
  onLikeChange,
}: PostModalProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [likeLoading, setLikeLoading] = useState(false);
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [showComments, setShowComments] = useState(true);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleLike = async () => {
    if (likeLoading || !currentUserEmail) return;
    setLikeLoading(true);

    const supabase = createClient();
    const newLiked = !liked;

    try {
      if (newLiked) {
        await supabase.from('post_likes').insert({
          post_id: post.id,
          user_email: currentUserEmail,
        });

        // Create notification for post author (if not liking own post)
        if (currentUserEmail.toLowerCase() !== post.author_email.toLowerCase()) {
          const { data: { user } } = await supabase.auth.getUser();
          const actorName = user?.user_metadata?.full_name || user?.user_metadata?.name || currentUserEmail.split('@')[0];

          await supabase.from('notifications').insert({
            user_email: post.author_email,
            type: 'like',
            post_id: post.id,
            actor_email: currentUserEmail,
            actor_name: actorName,
            message: post.content.substring(0, 50) + (post.content.length > 50 ? '...' : ''),
          });
        }
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
    if (!newComment.trim() || commentLoading || !currentUserEmail) return;
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

        // Create notifications
        const notificationsToCreate: Array<{
          user_email: string;
          type: string;
          post_id: string;
          actor_email: string;
          actor_name: string;
          message: string;
        }> = [];

        // Notify post author (if commenter is not the author)
        if (currentUserEmail.toLowerCase() !== post.author_email.toLowerCase()) {
          notificationsToCreate.push({
            user_email: post.author_email,
            type: 'comment',
            post_id: post.id,
            actor_email: currentUserEmail,
            actor_name: userName,
            message: newComment.trim().substring(0, 50) + (newComment.trim().length > 50 ? '...' : ''),
          });
        }

        // Notify other commenters on this post (reply notification)
        const otherCommenters = new Set(
          comments
            .map(c => c.user_email.toLowerCase())
            .filter(email =>
              email !== currentUserEmail.toLowerCase() &&
              email !== post.author_email.toLowerCase()
            )
        );

        otherCommenters.forEach(email => {
          notificationsToCreate.push({
            user_email: email,
            type: 'reply',
            post_id: post.id,
            actor_email: currentUserEmail,
            actor_name: userName,
            message: newComment.trim().substring(0, 50) + (newComment.trim().length > 50 ? '...' : ''),
          });
        });

        // Insert all notifications
        if (notificationsToCreate.length > 0) {
          await supabase.from('notifications').insert(notificationsToCreate);
        }

        setNewComment('');
      }
    } catch (error) {
      console.error('Error posting comment:', error);
    } finally {
      setCommentLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-brand-neutral-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-brown font-bold text-white text-sm">
              M
            </div>
            <div>
              <p className="font-medium text-brand-navy-900">Meroka</p>
              <p className="text-xs text-brand-navy-400">
                featuring {post.author_name}
                {post.created_at && ` · ${formatDistanceToNow(new Date(post.created_at))}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-brand-neutral-100 transition-colors"
          >
            <X className="h-5 w-5 text-brand-navy-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <p className="text-brand-navy-800 whitespace-pre-wrap text-base leading-relaxed">
            {post.content}
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-brand-neutral-100">
          <div className="flex items-center gap-4">
            <button
              onClick={handleLike}
              disabled={likeLoading || !currentUserEmail}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
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
              className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-brand-neutral-50 text-brand-navy-500 transition-colors"
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
            <div className="mt-4 pt-4 border-t border-brand-neutral-100">
              {/* Comment list */}
              {comments.length > 0 && (
                <div className="space-y-3 mb-4 max-h-[200px] overflow-y-auto">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-neutral-200 font-medium text-brand-navy-600 text-xs flex-shrink-0">
                        {comment.user_name?.charAt(0).toUpperCase() || 'U'}
                      </div>
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
              {currentUserEmail && (
                <div className="flex gap-2">
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
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
