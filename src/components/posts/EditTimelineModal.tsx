'use client';

import { useEffect, useState } from 'react';
import { X, Sparkles, Pencil, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

interface Like {
  user_email: string;
  user_name: string;
  created_at: string;
}

interface EditTimelineModalProps {
  postId: string;
  originalContent: string | null;
  currentContent: string;
  createdAt: string;
  updatedAt?: string | null;
  onClose: () => void;
}

export function EditTimelineModal({
  postId,
  originalContent,
  currentContent,
  createdAt,
  updatedAt,
  onClose,
}: EditTimelineModalProps) {
  const [likes, setLikes] = useState<Like[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLikes() {
      const supabase = createClient();

      const { data } = await supabase
        .from('post_likes')
        .select('user_email, created_at')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (data) {
        // Fetch user names for likes
        const emails = data.map(l => l.user_email);
        const { data: users } = await supabase
          .from('users')
          .select('email, name')
          .in('email', emails);

        const userMap = new Map(users?.map(u => [u.email, u.name]) || []);

        setLikes(data.map(l => ({
          user_email: l.user_email,
          user_name: userMap.get(l.user_email) || l.user_email.split('@')[0],
          created_at: l.created_at,
        })));
      }
      setLoading(false);
    }

    fetchLikes();
  }, [postId]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const wasEdited = originalContent !== null && originalContent !== currentContent;

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
          <h2 className="text-lg font-semibold text-brand-navy-900">Post Timeline</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-brand-neutral-100 transition-colors"
          >
            <X className="h-5 w-5 text-brand-navy-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Timeline */}
          <div className="space-y-6">
            {/* AI Generated */}
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                </div>
                {wasEdited && <div className="flex-1 w-0.5 bg-brand-neutral-200 my-2" />}
              </div>
              <div className="flex-1 pb-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-brand-navy-900">AI Generated</span>
                  <span className="text-sm text-brand-navy-500">{formatDateTime(createdAt)}</span>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                  <p className="text-sm text-brand-navy-700 whitespace-pre-wrap">
                    {originalContent || currentContent}
                  </p>
                </div>
              </div>
            </div>

            {/* Edited - only show if content was changed */}
            {wasEdited && updatedAt && (
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                    <Pencil className="h-5 w-5 text-amber-600" />
                  </div>
                </div>
                <div className="flex-1 pb-2">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-brand-navy-900">Edited</span>
                    <span className="text-sm text-brand-navy-500">{formatDateTime(updatedAt)}</span>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                    <p className="text-sm text-brand-navy-700 whitespace-pre-wrap">
                      {currentContent}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Likes Section */}
          {likes.length > 0 && (
            <>
              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-brand-neutral-200" />
                <span className="text-sm font-medium text-brand-navy-500">Likes</span>
                <div className="flex-1 h-px bg-brand-neutral-200" />
              </div>

              <div className="space-y-3">
                {likes.map((like, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <Heart className="h-4 w-4 text-red-500 fill-current" />
                    <span className="text-sm font-medium text-brand-navy-900">{like.user_name}</span>
                    <span className="text-sm text-brand-navy-500">{formatDateTime(like.created_at)}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {likes.length === 0 && !loading && (
            <>
              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-brand-neutral-200" />
                <span className="text-sm font-medium text-brand-navy-500">Likes</span>
                <div className="flex-1 h-px bg-brand-neutral-200" />
              </div>
              <p className="text-sm text-brand-navy-400 text-center">No likes yet</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
