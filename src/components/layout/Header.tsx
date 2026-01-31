'use client';

import { NotificationBell } from '@/components/layout/NotificationBell';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-brand-neutral-100 bg-white px-6">
      <div>
        <h1 className="text-xl font-semibold text-brand-navy-900">{title}</h1>
        {subtitle && <p className="text-sm text-brand-navy-600">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        <NotificationBell />
      </div>
    </header>
  );
}
