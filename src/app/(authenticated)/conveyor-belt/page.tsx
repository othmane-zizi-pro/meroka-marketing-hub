'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { RandomPostCard } from '@/components/posts/RandomPostCard';
import { useUser } from '@/hooks/useUser';
import { Loader2, RefreshCw, Eye, EyeOff, Linkedin } from 'lucide-react';
import { XIcon } from '@/components/ui/icons';
import { GenerationMetadata } from '@/types';
import { cn } from '@/lib/utils';

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

const POSTS_PER_PAGE = 10;
const ADMIN_EMAIL = 'othmane.zizi@meroka.com';

export default function ConveyorBeltPage() {
  const { user } = useUser();
  const [posts, setPosts] = useState<RandomPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdminView, setIsAdminView] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    setCurrentPage(1);
    try {
      const response = await fetch('/api/conveyor-belt/posts?status=pending_review');
      const data = await response.json();

      if (response.ok) {
        setPosts(data.posts || []);
      } else {
        console.error('Error fetching conveyor belt posts:', data.error);
      }
    } catch (error) {
      console.error('Error fetching conveyor belt posts:', error);
    } finally {
      setLoading(false);
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

    await fetchPosts();
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

    setPosts(prevPosts => prevPosts.filter(p => p.id !== postId));
  };

  const handleCandidateAction = async (
    originalPostId: string,
    candidateContent: string,
    candidateSource: string,
    action: 'proofreading' | 'schedule' | 'publish',
    scheduledFor?: string
  ) => {
    const response = await fetch('/api/random/posts/candidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        originalPostId,
        candidateContent,
        candidateSource,
        action,
        scheduledFor,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to create draft from candidate');
    }

    await fetchPosts();
  };

  const totalPages = Math.ceil(posts.length / POSTS_PER_PAGE);
  const paginatedPosts = posts.slice(
    (currentPage - 1) * POSTS_PER_PAGE,
    currentPage * POSTS_PER_PAGE
  );

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Conveyor Belt"
        subtitle="All AI-generated posts across platforms"
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto">
          {/* Controls */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm text-brand-navy-500">
                {posts.length} pending post{posts.length !== 1 ? 's' : ''} to review
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Admin View Toggle - Admin only */}
              {user?.email === ADMIN_EMAIL && (
                <button
                  onClick={() => setIsAdminView(!isAdminView)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                    isAdminView
                      ? "text-brand-navy-600 bg-brand-neutral-100 hover:bg-brand-neutral-200"
                      : "text-purple-700 bg-purple-100 hover:bg-purple-200"
                  )}
                  title={isAdminView ? 'Preview user view' : 'Back to admin view'}
                >
                  {isAdminView ? (
                    <>
                      <EyeOff className="h-4 w-4" />
                      Preview User View
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4" />
                      Admin View
                    </>
                  )}
                </button>
              )}
              <button
                onClick={fetchPosts}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-brand-navy-600 bg-brand-neutral-100 rounded-lg hover:bg-brand-neutral-200 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                Refresh
              </button>
            </div>
          </div>

          {/* Posts List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-brand-brown" />
            </div>
          ) : posts.length === 0 ? (
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
            <div className="space-y-4">
              {paginatedPosts.map((post) => (
                <div key={post.id} className="space-y-2">
                  {/* Platform Badge */}
                  {post.channel === 'linkedin' ? (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium w-fit">
                      <Linkedin className="h-3 w-3" />
                      LinkedIn
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium w-fit">
                      <XIcon className="h-3 w-3" />
                      X
                    </div>
                  )}
                  <RandomPostCard
                    post={post}
                    currentUserEmail={user?.email}
                    isAdminView={user?.email === ADMIN_EMAIL ? isAdminView : false}
                    onEdit={handleRandomEdit}
                    onAction={handleRandomAction}
                    onCandidateAction={handleCandidateAction}
                  />
                </div>
              ))}

              {/* Pagination */}
              {posts.length > POSTS_PER_PAGE && (
                <div className="flex items-center justify-between pt-6 border-t border-brand-neutral-100 mt-6">
                  <span className="text-sm text-brand-navy-500">
                    Showing {(currentPage - 1) * POSTS_PER_PAGE + 1}-{Math.min(currentPage * POSTS_PER_PAGE, posts.length)} of {posts.length} posts
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
          )}
        </div>
      </div>
    </div>
  );
}
