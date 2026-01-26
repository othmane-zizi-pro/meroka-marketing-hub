'use client';

import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Post, User } from '@/types';
import { getEmployeeById } from '@/lib/mock-data';
import {
  Heart,
  MessageCircle,
  CheckCircle,
  ThumbsUp,
  ThumbsDown,
  Edit,
  Send,
  Linkedin,
  Twitter,
  Instagram
} from 'lucide-react';

interface PostCardProps {
  post: Post;
  showVoting?: boolean;
  showAuthor?: boolean;
  onEdit?: (post: Post) => void;
}

const channelIcons = {
  linkedin: Linkedin,
  twitter: Twitter,
  instagram: Instagram,
};

const statusVariants: Record<string, 'default' | 'secondary' | 'success' | 'warning'> = {
  draft: 'secondary',
  pending: 'warning',
  approved: 'success',
  published: 'default',
};

export function PostCard({ post, showVoting = false, showAuthor = true, onEdit }: PostCardProps) {
  const [liked, setLiked] = useState(false);
  const [upvoted, setUpvoted] = useState(false);
  const [downvoted, setDownvoted] = useState(false);
  const [localUpvotes, setLocalUpvotes] = useState(post.upvotes);
  const [localDownvotes, setLocalDownvotes] = useState(post.downvotes);

  const author = getEmployeeById(post.authorId);
  const ChannelIcon = channelIcons[post.channel];

  const handleUpvote = () => {
    if (upvoted) {
      setUpvoted(false);
      setLocalUpvotes(prev => prev - 1);
    } else {
      setUpvoted(true);
      setLocalUpvotes(prev => prev + 1);
      if (downvoted) {
        setDownvoted(false);
        setLocalDownvotes(prev => prev - 1);
      }
    }
  };

  const handleDownvote = () => {
    if (downvoted) {
      setDownvoted(false);
      setLocalDownvotes(prev => prev - 1);
    } else {
      setDownvoted(true);
      setLocalDownvotes(prev => prev + 1);
      if (upvoted) {
        setUpvoted(false);
        setLocalUpvotes(prev => prev - 1);
      }
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {showAuthor && author && (
              <>
                <Avatar src={author.avatar} alt={author.name} size="md" />
                <div>
                  <p className="text-sm font-medium">{author.name}</p>
                  <p className="text-xs text-muted-foreground">{author.role}</p>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ChannelIcon className="h-4 w-4 text-muted-foreground" />
            <Badge variant={statusVariants[post.status]}>
              {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <p className="text-sm whitespace-pre-wrap">{post.content}</p>
        {post.imageUrl && (
          <div className="mt-3 overflow-hidden rounded-lg">
            <img
              src={post.imageUrl}
              alt="Post image"
              className="w-full h-48 object-cover"
            />
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-wrap gap-2 border-t pt-3">
        {showVoting ? (
          <>
            <Button
              variant={upvoted ? 'default' : 'ghost'}
              size="sm"
              onClick={handleUpvote}
              className="gap-1"
            >
              <ThumbsUp className="h-4 w-4" />
              {localUpvotes}
            </Button>
            <Button
              variant={downvoted ? 'destructive' : 'ghost'}
              size="sm"
              onClick={handleDownvote}
              className="gap-1"
            >
              <ThumbsDown className="h-4 w-4" />
              {localDownvotes}
            </Button>
            {onEdit && (
              <Button variant="ghost" size="sm" onClick={() => onEdit(post)} className="gap-1">
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            )}
          </>
        ) : (
          <>
            <Button
              variant={liked ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setLiked(!liked)}
              className="gap-1"
            >
              <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
              {post.likes + (liked ? 1 : 0)}
            </Button>
            <Button variant="ghost" size="sm" className="gap-1">
              <MessageCircle className="h-4 w-4" />
              {post.comments}
            </Button>
            <div className="flex-1" />
            {post.status === 'draft' && (
              <Button variant="outline" size="sm" className="gap-1">
                <Send className="h-4 w-4" />
                Submit
              </Button>
            )}
            {post.status === 'pending' && (
              <Button variant="default" size="sm" className="gap-1">
                <CheckCircle className="h-4 w-4" />
                Approve
              </Button>
            )}
          </>
        )}
      </CardFooter>
    </Card>
  );
}
