'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User, Post } from '@/types';
import { FileText, TrendingUp } from 'lucide-react';

interface EmployeeVoiceCardProps {
  employee: User;
  posts: Post[];
  onClick?: () => void;
}

export function EmployeeVoiceCard({ employee, posts, onClick }: EmployeeVoiceCardProps) {
  const totalUpvotes = posts.reduce((sum, post) => sum + post.upvotes, 0);
  const pendingPosts = posts.filter(p => p.status === 'pending' || p.status === 'draft').length;

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center">
          <Avatar src={employee.avatar} alt={employee.name} size="lg" />
          <h3 className="mt-3 font-semibold">{employee.name}</h3>
          <p className="text-sm text-muted-foreground">{employee.role}</p>
          <p className="text-xs text-muted-foreground">{employee.department}</p>

          <div className="mt-4 flex gap-4">
            <div className="flex items-center gap-1 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span>{posts.length} posts</span>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span>{totalUpvotes} votes</span>
            </div>
          </div>

          {pendingPosts > 0 && (
            <Badge variant="warning" className="mt-3">
              {pendingPosts} pending review
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
