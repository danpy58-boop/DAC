import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Suspense } from 'react';
import '@/app/globals.css';
import { OfflineSupport } from '@/components/offline-support';
import { Sidebar } from '@/components/sidebar';

export const metadata: Metadata = {
  title: 'Restaurant & Bar Ops',
  description: 'Production-ready Next.js operations platform for restaurant and bar teams.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <Suspense fallback={<aside className="sidebar-shell"><div className="brand-stack"><p className="eyebrow">Loading</p><h1>Restaurant &amp; Bar Ops</h1><p className="supporting-text">Preparing multi-location workspace...</p></div></aside>}>
            <Sidebar />
          </Suspense>
          <main className="main-shell">{children}</main>
        </div>
        <OfflineSupport />
      </body>
    </html>
  );
}
