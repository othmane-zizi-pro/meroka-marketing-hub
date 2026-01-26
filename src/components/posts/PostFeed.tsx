'use client';

import { useState } from 'react';
import { PostCard } from './PostCard';
import { Button } from '@/components/ui/button';
import { Post, PostStatus } from '@/types';

interface PostFeedProps {
  posts: Post[];
  showVoting?: boolean;
}

const statusFilters: { label: string; value: PostStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Published', value: 'published' },
];

export function PostFeed({ posts, showVoting = false }: PostFeedProps) {
  const [filter, setFilter] = useState<PostStatus | 'all'>('all');

  const filteredPosts = filter === 'all'
    ? posts
    : posts.filter(post => post.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {statusFilters.map((status) => (
          <Button
            key={status.value}
            variant={filter === status.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(status.value)}
          >
            {status.label}
          </Button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredPosts.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-muted-foreground">No posts found</p>
          </div>
        ) : (
          filteredPosts.map((post) => (
            <PostCard key={post.id} post={post} showVoting={showVoting} />
          ))
        )}
      </div>
    </div>
  );
}
