'use client';

import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Trophy, CheckCircle, FileText, Star, Medal } from 'lucide-react';
import { cn } from '@/lib/utils';

// Hardcoded leaderboard data
const leaderboardData = [
  {
    rank: 1,
    name: 'Sarah Chen',
    email: 'sarah.chen@meroka.com',
    avatar: undefined,
    postsProofread: 24,
    postsPublished: 18,
    totalContributions: 42,
    streak: 12,
  },
  {
    rank: 2,
    name: 'Michael Park',
    email: 'michael.park@meroka.com',
    avatar: undefined,
    postsProofread: 19,
    postsPublished: 15,
    totalContributions: 34,
    streak: 8,
  },
  {
    rank: 3,
    name: 'Emma Wilson',
    email: 'emma.wilson@meroka.com',
    avatar: undefined,
    postsProofread: 16,
    postsPublished: 12,
    totalContributions: 28,
    streak: 5,
  },
  {
    rank: 4,
    name: 'James Rodriguez',
    email: 'james.rodriguez@meroka.com',
    avatar: undefined,
    postsProofread: 14,
    postsPublished: 10,
    totalContributions: 24,
    streak: 6,
  },
  {
    rank: 5,
    name: 'Lisa Thompson',
    email: 'lisa.thompson@meroka.com',
    avatar: undefined,
    postsProofread: 12,
    postsPublished: 8,
    totalContributions: 20,
    streak: 3,
  },
  {
    rank: 6,
    name: 'David Kim',
    email: 'david.kim@meroka.com',
    avatar: undefined,
    postsProofread: 10,
    postsPublished: 7,
    totalContributions: 17,
    streak: 4,
  },
  {
    rank: 7,
    name: 'Rachel Green',
    email: 'rachel.green@meroka.com',
    avatar: undefined,
    postsProofread: 8,
    postsPublished: 6,
    totalContributions: 14,
    streak: 2,
  },
  {
    rank: 8,
    name: 'Tom Anderson',
    email: 'tom.anderson@meroka.com',
    avatar: undefined,
    postsProofread: 7,
    postsPublished: 5,
    totalContributions: 12,
    streak: 1,
  },
  {
    rank: 9,
    name: 'Nina Patel',
    email: 'nina.patel@meroka.com',
    avatar: undefined,
    postsProofread: 5,
    postsPublished: 4,
    totalContributions: 9,
    streak: 2,
  },
  {
    rank: 10,
    name: 'Chris Lee',
    email: 'chris.lee@meroka.com',
    avatar: undefined,
    postsProofread: 4,
    postsPublished: 3,
    totalContributions: 7,
    streak: 1,
  },
];

const topThree = leaderboardData.slice(0, 3);
const restOfList = leaderboardData.slice(3);

function PodiumCard({ employee, position }: { employee: typeof leaderboardData[0]; position: 1 | 2 | 3 }) {
  const styles = {
    1: {
      height: 'h-32',
      bg: 'bg-gradient-to-b from-yellow-400 to-yellow-500',
      medal: '🥇',
      ring: 'ring-2 ring-yellow-400',
    },
    2: {
      height: 'h-24',
      bg: 'bg-gradient-to-b from-gray-300 to-gray-400',
      medal: '🥈',
      ring: '',
    },
    3: {
      height: 'h-20',
      bg: 'bg-gradient-to-b from-amber-600 to-amber-700',
      medal: '🥉',
      ring: '',
    },
  }[position];

  return (
    <div className="flex flex-col items-center">
      <div className={cn(
        "w-full bg-white rounded-xl p-4 mb-2 shadow-lg",
        styles.ring
      )}>
        <div className="flex flex-col items-center">
          <Avatar alt={employee.name} size="lg" />
          <p className="mt-2 font-semibold text-brand-navy-900 text-center">{employee.name}</p>
          <p className="text-xs text-brand-navy-500">{employee.totalContributions} contributions</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-brand-navy-600">
            <span className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              {employee.postsProofread}
            </span>
            <span className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {employee.postsPublished}
            </span>
          </div>
        </div>
      </div>
      <div className="text-3xl mb-1">{styles.medal}</div>
      <div className={cn(
        "w-full rounded-t-lg flex items-center justify-center",
        styles.height,
        styles.bg
      )}>
        <span className="text-white text-2xl font-bold">{position}</span>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <div className="flex flex-col h-full">
      <Header
        title="Leaderboard"
        subtitle="Employee contributions to content creation"
      />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Podium Section */}
        <Card className="bg-gradient-to-br from-brand-navy-800 to-brand-navy-900 border-0">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Trophy className="h-6 w-6 text-yellow-400" />
              <h2 className="text-xl font-bold text-white">Top Contributors</h2>
            </div>

            <div className="flex items-end justify-center gap-4">
              {/* 2nd Place */}
              <div className="w-full max-w-[180px]">
                <PodiumCard employee={topThree[1]} position={2} />
              </div>
              {/* 1st Place */}
              <div className="w-full max-w-[200px]">
                <PodiumCard employee={topThree[0]} position={1} />
              </div>
              {/* 3rd Place */}
              <div className="w-full max-w-[180px]">
                <PodiumCard employee={topThree[2]} position={3} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Legend */}
        <div className="flex items-center justify-center gap-6 text-sm text-brand-navy-600">
          <span className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Posts Proofread
          </span>
          <span className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Posts Published
          </span>
          <span className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            Day Streak
          </span>
        </div>

        {/* Full Leaderboard */}
        <Card className="border-brand-neutral-100">
          <CardHeader>
            <CardTitle className="text-brand-navy-900">All Contributors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-brand-neutral-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-brand-navy-600">Rank</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-brand-navy-600">Employee</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-brand-navy-600">Proofread</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-brand-navy-600">Published</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-brand-navy-600">Total</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-brand-navy-600">Streak</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboardData.map((employee) => (
                    <tr key={employee.email} className="border-b border-brand-neutral-100 hover:bg-brand-neutral-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {employee.rank <= 3 ? (
                            <span className="text-xl">
                              {employee.rank === 1 ? '🥇' : employee.rank === 2 ? '🥈' : '🥉'}
                            </span>
                          ) : (
                            <span className="w-8 h-8 flex items-center justify-center rounded-full bg-brand-neutral-100 text-sm font-medium text-brand-navy-700">
                              {employee.rank}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar alt={employee.name} size="sm" />
                          <div>
                            <p className="text-sm font-medium text-brand-navy-900">{employee.name}</p>
                            <p className="text-xs text-brand-navy-500">{employee.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-sm text-brand-navy-700">{employee.postsProofread}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-sm text-brand-navy-700">{employee.postsPublished}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-sm font-semibold text-brand-navy-900">{employee.totalContributions}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center gap-1 text-sm text-brand-navy-700">
                          <Star className="h-3 w-3 text-yellow-500" />
                          {employee.streak}d
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
