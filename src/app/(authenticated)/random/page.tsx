'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Linkedin, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { XIcon } from '@/components/ui/icons';
import { RandomPostCard } from '@/components/posts/RandomPostCard';
import { cn } from '@/lib/utils';

type Platform = 'linkedin' | 'x';

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
}

export default function RandomPage() {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('linkedin');
  const [posts, setPosts] = useState<RandomPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPosts = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    else setRefreshing(true);

    try {
      const response = await fetch(`/api/random/posts?channel=${selectedPlatform}&status=pending_review`);
      const data = await response.json();

      if (response.ok) {
        setPosts(data.posts || []);
      } else {
        console.error('Error fetching posts:', data.error);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [selectedPlatform]);

  const handleEdit = async (postId: string, content: string, summary: string) => {
    const response = await fetch(`/api/drafts/${postId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, editSummary: summary }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to update post');
    }

    // Refresh posts to get updated content and history
    await fetchPosts(false);
  };

  const handleAction = async (postId: string, action: 'proofreading' | 'publish' | 'schedule', scheduledFor?: string) => {
    const response = await fetch(`/api/random/posts/${postId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, scheduledFor }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to perform action');
    }

    // Remove the post from the list (it's no longer pending_review)
    setPosts(posts => posts.filter(p => p.id !== postId));
  };

  const platforms = [
    { id: 'linkedin' as Platform, name: 'LinkedIn', icon: Linkedin, color: 'bg-blue-600' },
    { id: 'x' as Platform, name: 'X', icon: XIcon, color: 'bg-black' },
  ];

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Random Posts"
        subtitle="AI-generated posts from historical content"
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Platform Tabs */}
          <Card className="border-brand-neutral-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {platforms.map((platform) => {
                    const Icon = platform.icon;
                    const isSelected = selectedPlatform === platform.id;

                    return (
                      <button
                        key={platform.id}
                        onClick={() => setSelectedPlatform(platform.id)}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
                          isSelected
                            ? "bg-brand-brown text-white"
                            : "bg-brand-neutral-100 text-brand-navy-600 hover:bg-brand-neutral-200"
                        )}
                      >
                        <div className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full text-white",
                          platform.color
                        )}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <span className="font-medium">{platform.name}</span>
                      </button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchPosts(false)}
                  disabled={refreshing}
                >
                  <RefreshCw className={cn("h-4 w-4 mr-1", refreshing && "animate-spin")} />
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Posts List */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-brand-brown" />
            </div>
          ) : posts.length === 0 ? (
            <Card className="border-brand-neutral-100">
              <CardContent className="py-16 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
                    <Sparkles className="h-8 w-8 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-brand-navy-900">No pending posts</h3>
                    <p className="text-sm text-brand-navy-500 mt-1">
                      AI-generated posts for {selectedPlatform === 'linkedin' ? 'LinkedIn' : 'X'} will appear here
                    </p>
                  </div>
                  <p className="text-xs text-brand-navy-400 max-w-sm">
                    New posts are generated hourly based on your historical content.
                    Posts you approve, schedule, or send to proofreading will be removed from this queue.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-brand-navy-500">
                {posts.length} pending post{posts.length !== 1 ? 's' : ''} for {selectedPlatform === 'linkedin' ? 'LinkedIn' : 'X'}
              </p>
              {posts.map((post) => (
                <RandomPostCard
                  key={post.id}
                  post={post}
                  onEdit={handleEdit}
                  onAction={handleAction}
                />
              ))}
            </div>
          )}

          {/* Info Card */}
          <Card className="border-brand-neutral-100 bg-brand-neutral-50">
            <CardContent className="p-4">
              <h4 className="text-sm font-medium text-brand-navy-800 mb-2">How Random Posts Work</h4>
              <ul className="text-sm text-brand-navy-600 space-y-1">
                <li>• Posts are generated hourly using your historical content as inspiration</li>
                <li>• Edit content inline and track all changes in the version history</li>
                <li>• Preview how posts will look on each platform before publishing</li>
                <li>• Send to proofreading for team review, schedule for later, or publish immediately</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
