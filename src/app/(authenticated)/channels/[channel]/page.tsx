'use client';

import { useParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { PostFeed } from '@/components/posts/PostFeed';
import { getPostsByChannel } from '@/lib/mock-data';
import { Channel } from '@/types';

const channelNames: Record<Channel, string> = {
  linkedin: 'LinkedIn',
  twitter: 'X',
  instagram: 'Instagram',
};

const channelDescriptions: Record<Channel, string> = {
  linkedin: 'Professional content for thought leadership and company updates',
  twitter: 'Quick updates, threads, and engagement with the tech community',
  instagram: 'Visual content showcasing company culture and behind-the-scenes',
};

export default function ChannelPage() {
  const params = useParams();
  const channel = params.channel as Channel;

  const posts = getPostsByChannel(channel);
  const title = channelNames[channel] || 'Channel';
  const description = channelDescriptions[channel] || '';

  return (
    <div className="flex flex-col h-full">
      <Header title={title} subtitle={description} />

      <div className="flex-1 overflow-auto p-6">
        <PostFeed posts={posts} />
      </div>
    </div>
  );
}
