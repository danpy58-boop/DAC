'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ContextSwitcher } from '@/components/context-switcher';

const items = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dac', label: 'Daily Action Card' },
  { href: '/notes', label: 'Live Notes' },
  { href: '/tasks', label: 'Task Board' },
  { href: '/handoff', label: 'Shift Handoff' },
  { href: '/activity', label: 'Activity History' },
  { href: '/admin', label: 'Role Management' }
];

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const suffix = searchParams.toString() ? `?${searchParams.toString()}` : '';

  return (
    <aside className="sidebar-shell">
      <div className="brand-stack">
        <p className="eyebrow">Production Next.js App</p>
        <h1>Restaurant &amp; Bar Ops</h1>
        <p className="supporting-text">Multi-location operations workflow with site switching, permissions, audit history, offline support, and deployment-ready role administration.</p>
      </div>

      <ContextSwitcher />

      <nav className="nav-list" aria-label="Primary">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={`${item.href}${suffix}`} className={active ? 'nav-link active' : 'nav-link'}>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
