'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { EmployeeVoiceCard } from '@/components/campaigns/EmployeeVoiceCard';
import { PostCard } from '@/components/posts/PostCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { employees, getPostsByEmployee, getCampaignPosts } from '@/lib/mock-data';
import { User, Post } from '@/types';
import { ArrowLeft, Trophy, X } from 'lucide-react';

export default function EmployeeVoicesPage() {
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [showMostUpvoted, setShowMostUpvoted] = useState(false);

  const campaignPosts = getCampaignPosts('campaign-1');

  // Get posts sorted by upvotes for "Most Upvoted" view
  const sortedByUpvotes = [...campaignPosts].sort((a, b) => b.upvotes - a.upvotes);

  const handleEditPost = (post: Post) => {
    alert(`Edit functionality coming soon for post: "${post.content.slice(0, 50)}..."`);
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Employee Voices"
        subtitle="AI-generated posts for employee advocacy"
      />

      <div className="flex-1 overflow-auto p-6">
        {selectedEmployee ? (
          // Employee Detail View
          <div className="space-y-4">
            <Button
              variant="ghost"
              onClick={() => setSelectedEmployee(null)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to all employees
            </Button>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Avatar
                    src={selectedEmployee.avatar}
                    alt={selectedEmployee.name}
                    size="lg"
                  />
                  <div>
                    <CardTitle>{selectedEmployee.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{selectedEmployee.role}</p>
                    <p className="text-sm text-muted-foreground mt-1">{selectedEmployee.bio}</p>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <h3 className="text-lg font-semibold">AI-Generated Posts</h3>
            <div className="space-y-4">
              {getPostsByEmployee(selectedEmployee.id)
                .filter(p => p.campaignId === 'campaign-1')
                .map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    showVoting
                    showAuthor={false}
                    onEdit={selectedEmployee.id === 'user-1' ? handleEditPost : undefined}
                  />
                ))}
            </div>
          </div>
        ) : (
          // Main View
          <div className="space-y-6">
            {/* View Toggle */}
            <div className="flex gap-2">
              <Button
                variant={!showMostUpvoted ? 'default' : 'outline'}
                onClick={() => setShowMostUpvoted(false)}
              >
                All Employees
              </Button>
              <Button
                variant={showMostUpvoted ? 'default' : 'outline'}
                onClick={() => setShowMostUpvoted(true)}
                className="gap-2"
              >
                <Trophy className="h-4 w-4" />
                Most Upvoted
              </Button>
            </div>

            {showMostUpvoted ? (
              // Most Upvoted View
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Top posts ranked by employee upvotes
                </p>
                {sortedByUpvotes.slice(0, 10).map((post, index) => (
                  <div key={post.id} className="flex gap-4 items-start">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <PostCard post={post} showVoting />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Employee Grid View
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {employees.map((employee) => (
                  <EmployeeVoiceCard
                    key={employee.id}
                    employee={employee}
                    posts={getPostsByEmployee(employee.id).filter(p => p.campaignId === 'campaign-1')}
                    onClick={() => setSelectedEmployee(employee)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
