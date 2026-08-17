'use client';

import { useEffect, useMemo, useState } from 'react';
import { flushQueuedActions, getPendingQueueCount, getQueueEventName } from '@/lib/offline-sync-client';

export function OfflineSupport() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const queueEventName = useMemo(() => getQueueEventName(), []);

  useEffect(() => {
    setIsOnline(typeof navigator === 'undefined' ? true : navigator.onLine);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        setStatusMessage('Service worker registration failed.');
      });
    }

    const refreshPending = async () => {
      try {
        setPendingCount(await getPendingQueueCount());
      } catch {
        setPendingCount(0);
      }
    };

    const syncIfPossible = async () => {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        const result = await flushQueuedActions();
        await refreshPending();
        if (result.processed > 0) {
          setStatusMessage(`Synced ${result.processed} offline change${result.processed === 1 ? '' : 's'}.`);
        } else if (result.failed && result.remaining > 0) {
          setStatusMessage(`${result.remaining} change${result.remaining === 1 ? '' : 's'} still waiting to sync.`);
        }
      }
    };

    const handleOnline = async () => {
      setIsOnline(true);
      await syncIfPossible();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setStatusMessage('Offline mode active. Changes will sync later.');
    };

    const handleQueueUpdate = async () => {
      await refreshPending();
    };

    refreshPending();
    syncIfPossible();
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener(queueEventName, handleQueueUpdate as EventListener);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener(queueEventName, handleQueueUpdate as EventListener);
    };
  }, [queueEventName]);

  const badgeTone = !isOnline ? 'warning' : pendingCount ? 'warning' : 'success';
  const primaryText = !isOnline
    ? 'Offline mode'
    : pendingCount
      ? `${pendingCount} pending sync`
      : 'All changes synced';

  return (
    <div className="offline-status-shell">
      <div className={`offline-status-badge ${badgeTone}`}>
        <strong>{primaryText}</strong>
        <span>{statusMessage || (isOnline ? 'App ready for tablet and mobile use.' : 'You can keep working offline.')}</span>
      </div>
    </div>
  );
}
