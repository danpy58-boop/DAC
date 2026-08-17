'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { enqueueOfflineAction } from '@/lib/offline-sync-client';
import type { NoteView } from '@/lib/types';

type Props = {
  initialNotes: NoteView[];
  userId: string;
  venueId: string;
  canEdit: boolean;
  venueName: string;
  role: string;
};

export function NotesManager({ initialNotes, userId, venueId, canEdit, venueName, role }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState(initialNotes);
  const [form, setForm] = useState({ category: 'Operations', author: 'Manager on duty', text: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const querySuffix = useMemo(() => new URLSearchParams({ userId, venueId }).toString(), [userId, venueId]);

  async function createNote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit) {
      setMessage(`Your ${role.toLowerCase()} role is read-only for ${venueName}.`);
      return;
    }

    const payload = { ...form };
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await enqueueOfflineAction({
        url: `/api/notes?${querySuffix}`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        entityLabel: 'note',
        summary: `Offline note queued for ${venueName}`
      });
      const timestamp = new Date().toISOString();
      setNotes((current) => [{ id: `offline-${Date.now()}`, category: payload.category, text: payload.text, author: payload.author, createdAt: timestamp, updatedAt: timestamp }, ...current]);
      setForm({ category: 'Operations', author: 'Manager on duty', text: '' });
      setMessage(`Note saved offline for ${venueName}. It will sync automatically when back online.`);
      return;
    }

    setMessage('Adding note...');
    try {
      const response = await fetch(`/api/notes?${querySuffix}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error || 'Unable to add note');
        return;
      }
      setNotes((current) => [result, ...current]);
      setForm({ category: 'Operations', author: 'Manager on duty', text: '' });
      setMessage(`Note added for ${venueName}. Audit log recorded.`);
      startTransition(() => router.refresh());
    } catch {
      await enqueueOfflineAction({
        url: `/api/notes?${querySuffix}`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        entityLabel: 'note',
        summary: `Offline note queued for ${venueName}`
      });
      const timestamp = new Date().toISOString();
      setNotes((current) => [{ id: `offline-${Date.now()}`, category: payload.category, text: payload.text, author: payload.author, createdAt: timestamp, updatedAt: timestamp }, ...current]);
      setForm({ category: 'Operations', author: 'Manager on duty', text: '' });
      setMessage(`Connection failed. Note queued offline for ${venueName}.`);
    }
  }

  async function clearNotes() {
    if (!canEdit) {
      setMessage(`Your ${role.toLowerCase()} role is read-only for ${venueName}.`);
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await enqueueOfflineAction({
        url: `/api/notes?${querySuffix}`,
        method: 'DELETE',
        entityLabel: 'note',
        summary: `Offline clear-notes queued for ${venueName}`
      });
      setNotes([]);
      setMessage(`Clear-notes action saved offline for ${venueName}.`);
      return;
    }

    setMessage('Clearing notes...');
    try {
      const response = await fetch(`/api/notes?${querySuffix}`, { method: 'DELETE' });
      if (!response.ok) {
        const payload = await response.json();
        setMessage(payload.error || 'Unable to clear notes');
        return;
      }
      setNotes([]);
      setMessage(`All ${venueName} notes cleared. Audit log recorded.`);
      startTransition(() => router.refresh());
    } catch {
      await enqueueOfflineAction({
        url: `/api/notes?${querySuffix}`,
        method: 'DELETE',
        entityLabel: 'note',
        summary: `Offline clear-notes queued for ${venueName}`
      });
      setNotes([]);
      setMessage(`Connection failed. Clear-notes action queued offline for ${venueName}.`);
    }
  }

  async function saveEdit(note: NoteView) {
    if (!canEdit) {
      setMessage(`Your ${role.toLowerCase()} role is read-only for ${venueName}.`);
      return;
    }
    if (note.id.startsWith('offline-')) {
      setEditingId(null);
      setMessage('This note is pending initial sync. Edit it again after it syncs online.');
      return;
    }

    const payload = { category: note.category, text: note.text, author: note.author };
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await enqueueOfflineAction({
        url: `/api/notes/${note.id}?${querySuffix}`,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        entityLabel: 'note',
        summary: `Offline note edit queued for ${venueName}`
      });
      setNotes((current) => current.map((item) => item.id === note.id ? { ...item, ...payload, updatedAt: new Date().toISOString() } : item));
      setEditingId(null);
      setMessage(`Note edit saved offline for ${venueName}.`);
      return;
    }

    setMessage('Saving note edit...');
    try {
      const response = await fetch(`/api/notes/${note.id}?${querySuffix}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error || 'Unable to update note');
        return;
      }
      setNotes((current) => current.map((item) => item.id === note.id ? result : item));
      setEditingId(null);
      setMessage(`Note updated for ${venueName}. Audit log recorded.`);
      startTransition(() => router.refresh());
    } catch {
      await enqueueOfflineAction({
        url: `/api/notes/${note.id}?${querySuffix}`,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        entityLabel: 'note',
        summary: `Offline note edit queued for ${venueName}`
      });
      setNotes((current) => current.map((item) => item.id === note.id ? { ...item, ...payload, updatedAt: new Date().toISOString() } : item));
      setEditingId(null);
      setMessage(`Connection failed. Note edit queued offline for ${venueName}.`);
    }
  }

  function updateLocalNote(noteId: string, key: keyof NoteView, value: string) {
    setNotes((current) => current.map((note) => note.id === noteId ? { ...note, [key]: value } : note));
  }

  return (
    <div className="screen-grid two-column">
      <form className="panel-card" onSubmit={createNote}>
        <div className="panel-heading"><h3>Add live note</h3></div>
        {!canEdit ? <p className="read-only-banner compact">Read-only access for this site.</p> : null}
        <fieldset disabled={!canEdit || isPending}>
          <label>Category<select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}><option>Operations</option><option>Bar</option><option>Kitchen</option><option>Guest</option><option>Staffing</option><option>Maintenance</option></select></label>
          <label>Author<input value={form.author} onChange={(event) => setForm((current) => ({ ...current, author: event.target.value }))} /></label>
          <label>Note<textarea rows={8} value={form.text} onChange={(event) => setForm((current) => ({ ...current, text: event.target.value }))} /></label>
          <div className="button-row">
            <button className="primary-button" type="submit">Add note</button>
            <button className="secondary-button" onClick={clearNotes} type="button">Clear notes</button>
          </div>
        </fieldset>
        {message ? <p className="inline-message">{message}</p> : null}
      </form>

      <section className="panel-card">
        <div className="panel-heading"><h3>{venueName} note feed</h3></div>
        <div className="stack-list">
          {notes.length ? notes.map((note) => {
            const editing = editingId === note.id;
            const isPendingOffline = note.id.startsWith('offline-');
            return (
              <article key={note.id} className="stack-card">
                <div className="meta-row">
                  <span className="pill">{note.category}</span>
                  {isPendingOffline ? <span className="pill warning">pending sync</span> : null}
                  <span>{note.author}</span>
                  <span>{new Date(note.updatedAt || note.createdAt).toLocaleString()}</span>
                </div>
                {editing ? (
                  <div>
                    <label>Category<select value={note.category} onChange={(event) => updateLocalNote(note.id, 'category', event.target.value)}><option>Operations</option><option>Bar</option><option>Kitchen</option><option>Guest</option><option>Staffing</option><option>Maintenance</option></select></label>
                    <label>Author<input value={note.author} onChange={(event) => updateLocalNote(note.id, 'author', event.target.value)} /></label>
                    <label>Text<textarea rows={5} value={note.text} onChange={(event) => updateLocalNote(note.id, 'text', event.target.value)} /></label>
                    <div className="button-row">
                      <button className="primary-button" onClick={() => saveEdit(note)} type="button">Save edit</button>
                      <button className="secondary-button" onClick={() => setEditingId(null)} type="button">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p>{note.text}</p>
                    <div className="button-row">
                      <button className="secondary-button" disabled={!canEdit || isPendingOffline} onClick={() => setEditingId(note.id)} type="button">Edit note</button>
                    </div>
                  </>
                )}
              </article>
            );
          }) : <p className="empty-state">No notes recorded yet for this site.</p>}
        </div>
      </section>
    </div>
  );
}
