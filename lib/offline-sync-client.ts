'use client';

type QueuedAction = {
  id?: number;
  url: string;
  method: 'POST' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;
  entityLabel: string;
  summary: string;
  createdAt: string;
};

const DB_NAME = 'restaurant-bar-ops-offline';
const STORE_NAME = 'queuedActions';
const DB_VERSION = 1;
const QUEUE_EVENT = 'offline-queue-updated';

function notifyQueueUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(QUEUE_EVENT));
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Unable to open IndexedDB'));
  });
}

async function withStore<T>(mode: IDBTransactionMode, handler: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason?: unknown) => void) => void) {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    handler(store, resolve, reject);
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'));
    transaction.oncomplete = () => db.close();
  });
}

export function getQueueEventName() {
  return QUEUE_EVENT;
}

export async function enqueueOfflineAction(action: Omit<QueuedAction, 'createdAt'>) {
  const queuedAction: QueuedAction = { ...action, createdAt: new Date().toISOString() };
  await withStore<number>('readwrite', (store, resolve, reject) => {
    const request = store.add(queuedAction);
    request.onsuccess = () => resolve(Number(request.result));
    request.onerror = () => reject(request.error);
  });
  notifyQueueUpdate();
}

export async function listQueuedActions() {
  return withStore<QueuedAction[]>('readonly', (store, resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve((request.result as QueuedAction[]).sort((a, b) => String(a.id).localeCompare(String(b.id))));
    request.onerror = () => reject(request.error);
  });
}

export async function getPendingQueueCount() {
  const actions = await listQueuedActions();
  return actions.length;
}

async function deleteQueuedAction(id: number) {
  await withStore<void>('readwrite', (store, resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function flushQueuedActions() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { processed: 0, remaining: await getPendingQueueCount(), failed: false };
  }

  const queued = await listQueuedActions();
  let processed = 0;
  let failed = false;

  for (const action of queued) {
    try {
      const response = await fetch(action.url, {
        method: action.method,
        headers: action.headers ?? { 'Content-Type': 'application/json' },
        body: action.body
      });

      if (!response.ok) {
        failed = true;
        break;
      }

      if (typeof action.id === 'number') {
        await deleteQueuedAction(action.id);
      }
      processed += 1;
    } catch {
      failed = true;
      break;
    }
  }

  notifyQueueUpdate();
  return { processed, remaining: await getPendingQueueCount(), failed };
}
