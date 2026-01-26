'use client';

import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { currentUser, channelStats } from '@/lib/mock-data';
import { Linkedin, Twitter, Instagram, ArrowRight, TrendingUp, CheckCircle, Clock } from 'lucide-react';

const channelIcons = {
  linkedin: Linkedin,
  twitter: Twitter,
  instagram: Instagram,
};

const channelNames = {
  linkedin: 'LinkedIn',
  twitter: 'X (Twitter)',
  instagram: 'Instagram',
};

const channelColors = {
  linkedin: 'bg-brand-navy-600',
  twitter: 'bg-brand-navy-800',
  instagram: 'bg-gradient-to-br from-brand-brown-dark to-brand-brown',
};

export default function DashboardPage() {
  const totalPending = channelStats.reduce((sum, ch) => sum + ch.pendingPosts, 0);
  const totalApproved = channelStats.reduce((sum, ch) => sum + ch.approvedToday, 0);
  const totalPublished = channelStats.reduce((sum, ch) => sum + ch.publishedThisWeek, 0);

  return (
    <div className="flex flex-col h-full">
      <Header
        title={`Welcome back, ${currentUser.name.split(' ')[0]}!`}
        subtitle="Here's what's happening with your marketing content"
      />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-brand-neutral-100 border-brand-neutral-100">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-brown/10">
                  <Clock className="h-6 w-6 text-brand-brown" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-brand-navy-900">{totalPending}</p>
                  <p className="text-sm text-brand-navy-600">Pending Review</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-brand-neutral-100 border-brand-neutral-100">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-brand-navy-900">{totalApproved}</p>
                  <p className="text-sm text-brand-navy-600">Approved Today</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-brand-neutral-100 border-brand-neutral-100">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-ice">
                  <TrendingUp className="h-6 w-6 text-brand-navy-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-brand-navy-900">{totalPublished}</p>
                  <p className="text-sm text-brand-navy-600">Published This Week</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Channel Cards */}
        <div>
          <h2 className="text-lg font-semibold mb-4 text-brand-navy-900">Channels</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {channelStats.map((stats) => {
              const Icon = channelIcons[stats.channel];
              const name = channelNames[stats.channel];
              const color = channelColors[stats.channel];

              return (
                <Card key={stats.channel} className="overflow-hidden border-brand-neutral-100">
                  <div className={`h-2 ${color}`} />
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color} text-white`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-base text-brand-navy-900">{name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-brand-navy-600">Pending</span>
                        <span className="font-medium text-brand-navy-900">{stats.pendingPosts}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-brand-navy-600">Approved today</span>
                        <span className="font-medium text-brand-navy-900">{stats.approvedToday}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-brand-navy-600">This week</span>
                        <span className="font-medium text-brand-navy-900">{stats.publishedThisWeek}</span>
                      </div>
                    </div>
                    <Link href={`/channels/${stats.channel}`}>
                      <Button variant="outline" className="w-full mt-4 gap-2 border-brand-navy-300 text-brand-navy-800 hover:bg-brand-neutral-100">
                        View Posts
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold mb-4 text-brand-navy-900">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/campaigns/employee-voices">
              <Card className="cursor-pointer transition-all hover:shadow-md hover:border-brand-brown/50 border-brand-neutral-100">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-brand-navy-900">Employee Voices Campaign</h3>
                  <p className="text-sm text-brand-navy-600 mt-1">
                    Review and upvote employee-generated posts
                  </p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/settings">
              <Card className="cursor-pointer transition-all hover:shadow-md hover:border-brand-brown/50 border-brand-neutral-100">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-brand-navy-900">Train Your AI Agent</h3>
                  <p className="text-sm text-brand-navy-600 mt-1">
                    Add example posts to improve AI suggestions
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
