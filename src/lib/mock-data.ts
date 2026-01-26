import { User, Post, Campaign, ChannelStats } from '@/types';

export const currentUser: User = {
  id: 'user-1',
  name: 'Sarah Chen',
  email: 'sarah.chen@meroka.com',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
  role: 'Product Marketing Manager',
  department: 'Marketing',
  bio: 'Passionate about telling product stories that resonate. 5 years at Meroka.',
};

export const employees: User[] = [
  currentUser,
  {
    id: 'user-2',
    name: 'Marcus Johnson',
    email: 'marcus.j@meroka.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus',
    role: 'Senior Engineer',
    department: 'Engineering',
    bio: 'Building the future of commerce. Coffee enthusiast and open source contributor.',
  },
  {
    id: 'user-3',
    name: 'Priya Sharma',
    email: 'priya.s@meroka.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Priya',
    role: 'UX Designer',
    department: 'Design',
    bio: 'Design is thinking made visual. Creating delightful experiences at Meroka.',
  },
  {
    id: 'user-4',
    name: 'Alex Rivera',
    email: 'alex.r@meroka.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
    role: 'Customer Success Lead',
    department: 'Customer Success',
    bio: 'Helping merchants succeed is my passion. 3 years championing customer needs.',
  },
];

export const posts: Post[] = [
  // LinkedIn posts
  {
    id: 'post-1',
    content: "Excited to share that we've just shipped a game-changing feature at Meroka! Our new AI-powered inventory forecasting helps merchants predict demand with 94% accuracy. The best part? Watching small businesses save hours every week. This is why I love working here. #ProductMarketing #Ecommerce #AI",
    channel: 'linkedin',
    status: 'pending',
    authorId: 'user-1',
    createdAt: '2024-01-26T09:00:00Z',
    likes: 0,
    comments: 0,
    upvotes: 12,
    downvotes: 2,
    campaignId: 'campaign-1',
  },
  {
    id: 'post-2',
    content: "3 years ago, I joined Meroka as a junior engineer. Today, I'm leading our payments infrastructure team. What I've learned: growth happens when you're surrounded by people who believe in you. Grateful for the mentorship culture here. 🚀 #CareerGrowth #Engineering #Startup",
    channel: 'linkedin',
    status: 'approved',
    authorId: 'user-2',
    createdAt: '2024-01-26T10:30:00Z',
    likes: 45,
    comments: 8,
    upvotes: 24,
    downvotes: 1,
    campaignId: 'campaign-1',
  },
  {
    id: 'post-3',
    content: "Design isn't just about making things pretty – it's about solving real problems. Today I shadowed a merchant using our checkout flow and discovered friction points we never saw in testing. Sometimes the best insights come from watching, not asking. #UXDesign #CustomerResearch",
    channel: 'linkedin',
    status: 'draft',
    authorId: 'user-3',
    createdAt: '2024-01-26T11:00:00Z',
    likes: 0,
    comments: 0,
    upvotes: 8,
    downvotes: 0,
    campaignId: 'campaign-1',
  },
  {
    id: 'post-4',
    content: "Just wrapped up our quarterly business review with our top merchants. One insight that stood out: they don't just want a platform – they want a partner. At Meroka, we're building relationships, not just software. #CustomerSuccess #B2B #Ecommerce",
    channel: 'linkedin',
    status: 'pending',
    authorId: 'user-4',
    createdAt: '2024-01-26T14:00:00Z',
    likes: 0,
    comments: 0,
    upvotes: 15,
    downvotes: 3,
    campaignId: 'campaign-1',
  },
  // Twitter posts
  {
    id: 'post-5',
    content: "Hot take: The best product launches aren't about features – they're about stories. Just helped ship something that'll change how merchants think about inventory. More soon 👀 #ProductMarketing",
    channel: 'twitter',
    status: 'pending',
    authorId: 'user-1',
    createdAt: '2024-01-26T09:15:00Z',
    likes: 0,
    comments: 0,
    upvotes: 6,
    downvotes: 1,
  },
  {
    id: 'post-6',
    content: "Deployed on a Friday and didn't break prod. AMA. 😎 #DevLife #Meroka",
    channel: 'twitter',
    status: 'approved',
    authorId: 'user-2',
    createdAt: '2024-01-26T16:00:00Z',
    likes: 127,
    comments: 23,
    upvotes: 18,
    downvotes: 4,
  },
  {
    id: 'post-7',
    content: "Pro tip: Before you design the solution, design the problem. Spent today mapping the real merchant journey vs what we assumed. The gaps were... enlightening. 🧵",
    channel: 'twitter',
    status: 'draft',
    authorId: 'user-3',
    createdAt: '2024-01-26T12:30:00Z',
    likes: 0,
    comments: 0,
    upvotes: 9,
    downvotes: 0,
  },
  // Instagram posts
  {
    id: 'post-8',
    content: "Behind the scenes at Meroka HQ! Our team just wrapped a product sprint and celebrated with our famous Friday demos. There's nothing like seeing months of work come together. ✨ #LifeAtMeroka #StartupLife #TeamWork",
    channel: 'instagram',
    status: 'pending',
    authorId: 'user-1',
    createdAt: '2024-01-26T17:00:00Z',
    likes: 0,
    comments: 0,
    upvotes: 11,
    downvotes: 2,
    imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800',
  },
  {
    id: 'post-9',
    content: "Whiteboard sessions hit different when you're solving real problems. Today's challenge: making checkout 2 seconds faster. Spoiler: we found 3 seconds. 🎯 #DesignThinking #UX #Meroka",
    channel: 'instagram',
    status: 'draft',
    authorId: 'user-3',
    createdAt: '2024-01-26T15:00:00Z',
    likes: 0,
    comments: 0,
    upvotes: 7,
    downvotes: 1,
    imageUrl: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800',
  },
];

export const campaigns: Campaign[] = [
  {
    id: 'campaign-1',
    name: 'Employee Voices',
    description: 'Amplify authentic employee stories across social media. Each employee gets AI-generated post suggestions based on their role and expertise.',
    status: 'active',
    startDate: '2024-01-15',
    postCount: 45,
  },
  {
    id: 'campaign-2',
    name: 'Product Launch: AI Inventory',
    description: 'Coordinated launch campaign for our new AI-powered inventory forecasting feature.',
    status: 'active',
    startDate: '2024-01-20',
    endDate: '2024-02-20',
    postCount: 12,
  },
  {
    id: 'campaign-3',
    name: 'Year in Review 2023',
    description: 'Celebrating our achievements and milestones from 2023.',
    status: 'completed',
    startDate: '2023-12-15',
    endDate: '2024-01-05',
    postCount: 28,
  },
];

export const channelStats: ChannelStats[] = [
  {
    channel: 'linkedin',
    pendingPosts: 8,
    approvedToday: 3,
    publishedThisWeek: 12,
  },
  {
    channel: 'twitter',
    pendingPosts: 5,
    approvedToday: 2,
    publishedThisWeek: 18,
  },
  {
    channel: 'instagram',
    pendingPosts: 3,
    approvedToday: 1,
    publishedThisWeek: 6,
  },
];

export function getPostsByChannel(channel: string): Post[] {
  return posts.filter(post => post.channel === channel);
}

export function getPostsByEmployee(employeeId: string): Post[] {
  return posts.filter(post => post.authorId === employeeId);
}

export function getEmployeeById(id: string): User | undefined {
  return employees.find(emp => emp.id === id);
}

export function getCampaignPosts(campaignId: string): Post[] {
  return posts.filter(post => post.campaignId === campaignId);
}
