'use client';

import { Heart, Trophy, Medal } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface PodiumPost {
  id: string;
  content: string;
  author_name: string;
  author_email: string;
  author_avatar?: string;
  likes_count: number;
}

interface PodiumProps {
  posts: PodiumPost[];
  onPostClick?: (post: PodiumPost) => void;
}

export function Podium({ posts, onPostClick }: PodiumProps) {
  if (posts.length === 0) return null;

  // Reorder for podium display: 2nd, 1st, 3rd
  const orderedPosts = [
    posts[1], // 2nd place (left)
    posts[0], // 1st place (center)
    posts[2], // 3rd place (right)
  ].filter(Boolean);

  const podiumStyles = [
    { height: 'h-32', bg: 'bg-gradient-to-b from-gray-300 to-gray-400', medal: '🥈', place: 2 },
    { height: 'h-40', bg: 'bg-gradient-to-b from-yellow-400 to-yellow-500', medal: '🥇', place: 1 },
    { height: 'h-24', bg: 'bg-gradient-to-b from-amber-600 to-amber-700', medal: '🥉', place: 3 },
  ];

  return (
    <div className="bg-gradient-to-br from-brand-navy-800 to-brand-navy-900 rounded-2xl p-6 mb-8">
      <div className="flex items-center gap-2 mb-6">
        <Trophy className="h-6 w-6 text-yellow-400" />
        <h2 className="text-xl font-bold text-white">Most Upvoted This Week</h2>
      </div>

      <div className="flex items-end justify-center gap-4">
        {orderedPosts.map((post, index) => {
          const style = podiumStyles[index];
          const isFirst = style.place === 1;

          return (
            <div key={post.id} className="flex flex-col items-center w-full max-w-[200px]">
              {/* Post card */}
              <div
                onClick={() => onPostClick?.(post)}
                className={cn(
                  "w-full bg-white rounded-xl p-4 mb-2 shadow-lg transform transition-transform hover:scale-105 cursor-pointer",
                  isFirst && "ring-2 ring-yellow-400"
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-brown font-bold text-white text-xs">
                    M
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-brand-navy-900 truncate">
                      Meroka
                    </p>
                    <p className="text-xs text-brand-navy-400 truncate">
                      ft. {post.author_name}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-brand-navy-600 line-clamp-3 mb-2">
                  {post.content}
                </p>
                <div className="flex items-center gap-1 text-brand-brown">
                  <Heart className="h-4 w-4 fill-current" />
                  <span className="text-sm font-semibold">{post.likes_count}</span>
                </div>
              </div>

              {/* Medal */}
              <div className="text-4xl mb-1">{style.medal}</div>

              {/* Podium block */}
              <div className={cn(
                "w-full rounded-t-lg flex items-center justify-center",
                style.height,
                style.bg
              )}>
                <span className="text-white text-3xl font-bold">{style.place}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
