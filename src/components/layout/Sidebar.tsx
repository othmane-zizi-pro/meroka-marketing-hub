'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Linkedin,
  Twitter,
  Instagram,
  Megaphone,
  Settings,
  LogOut,
  Users
} from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { currentUser } from '@/lib/mock-data';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'LinkedIn', href: '/channels/linkedin', icon: Linkedin },
  { name: 'X (Twitter)', href: '/channels/twitter', icon: Twitter },
  { name: 'Instagram', href: '/channels/instagram', icon: Instagram },
  { name: 'Campaigns', href: '/campaigns', icon: Megaphone },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
          M
        </div>
        <span className="text-lg font-semibold">Meroka Hub</span>
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
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t p-4">
        <div className="flex items-center gap-3">
          <Avatar
            src={currentUser.avatar}
            alt={currentUser.name}
            size="md"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{currentUser.name}</p>
            <p className="text-xs text-muted-foreground truncate">{currentUser.role}</p>
          </div>
        </div>
        <Link
          href="/login"
          className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Link>
      </div>
    </div>
  );
}
