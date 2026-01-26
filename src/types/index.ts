export type PostStatus = 'draft' | 'pending' | 'approved' | 'published';

export type Channel = 'linkedin' | 'twitter' | 'instagram';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
  department: string;
  bio?: string;
}

export interface Post {
  id: string;
  content: string;
  channel: Channel;
  status: PostStatus;
  authorId: string;
  createdAt: string;
  likes: number;
  comments: number;
  upvotes: number;
  downvotes: number;
  imageUrl?: string;
  campaignId?: string;
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'completed';
  startDate: string;
  endDate?: string;
  postCount: number;
}

export interface ChannelStats {
  channel: Channel;
  pendingPosts: number;
  approvedToday: number;
  publishedThisWeek: number;
}

export interface AgentSettings {
  examplePosts: string[];
  personalContext: string;
  preferredTone: 'professional' | 'casual' | 'inspiring';
}
