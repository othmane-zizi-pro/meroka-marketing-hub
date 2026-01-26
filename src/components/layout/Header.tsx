'use client';

import { Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-navy-300" />
          <Input
            type="search"
            placeholder="Search posts..."
            className="w-64 pl-9 border-brand-neutral-100 focus:border-brand-brown focus:ring-brand-brown"
          />
        </div>
        <Button variant="ghost" size="icon" className="relative text-brand-navy-600 hover:text-brand-navy-900 hover:bg-brand-neutral-100">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand-brown" />
        </Button>
      </div>
    </header>
  );
}
