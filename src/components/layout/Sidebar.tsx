'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Linkedin,
  Instagram,
  BarChart3,
  Trophy,
  Settings,
  LogOut,
  Send,
  FileEdit,
  Clock,
} from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { XIcon } from '@/components/ui/icons';
import { useUser, signOut } from '@/hooks/useUser';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'LinkedIn', href: '/channels/linkedin', icon: Linkedin },
  { name: 'X', href: '/channels/twitter', icon: XIcon },
  { name: 'Instagram', href: '/channels/instagram', icon: Instagram },
  { name: 'Posting', href: '/posting', icon: Send },
  { name: 'Proofreading', href: '/proofreading', icon: FileEdit },
  { name: 'Scheduled', href: '/scheduled', icon: Clock },
  { name: 'KPIs', href: '/kpis', icon: BarChart3 },
  // { name: 'Leaderboard', href: '/leaderboard', icon: Trophy }, // Hidden for now
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, loading } = useUser();

  return (
    <div className="flex h-screen w-64 flex-col bg-brand-navy-800">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-brand-navy-600/30 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-brown font-bold text-white">
          M
        </div>
        <span className="text-lg font-semibold text-brand-neutral-50">MCUBE</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-brown text-white'
                  : 'text-brand-navy-300 hover:bg-brand-navy-600/50 hover:text-brand-neutral-50'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-brand-navy-600/30 p-4">
        <div className="flex items-center gap-3">
          {loading ? (
            <div className="h-10 w-10 rounded-full bg-brand-navy-600 animate-pulse" />
          ) : (
            <Avatar
              src={user?.avatar || undefined}
              alt={user?.name || 'User'}
              size="md"
            />
          )}
          <div className="flex-1 min-w-0">
            {loading ? (
              <>
                <div className="h-4 w-24 bg-brand-navy-600 rounded animate-pulse" />
                <div className="h-3 w-32 bg-brand-navy-600 rounded animate-pulse mt-1" />
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-brand-neutral-50 truncate">
                  {user?.name || 'User'}
                </p>
                <p className="text-xs text-brand-navy-300 truncate">
                  {user?.email || ''}
                </p>
              </>
            )}
          </div>
        </div>
        <button
          onClick={() => signOut()}
          className="mt-3 w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-brand-navy-300 hover:bg-brand-navy-600/50 hover:text-brand-neutral-50 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}
