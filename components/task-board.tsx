'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import type { TaskView } from '@/lib/types';

type Props = {
  initialTasks: TaskView[];
  userId: string;
  venueId: string;
  canEdit: boolean;
  venueName: string;
  role: string;
};

export function TaskBoard({ initialTasks, userId, venueId, canEdit, venueName, role }: Props) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [form, setForm] = useState({ title: '', owner: '', dueTime: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();
  const querySuffix = useMemo(() => new URLSearchParams({ userId, venueId }).toString(), [userId, venueId]);

  async function createTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit) {
      setMessage(`Your ${role.toLowerCase()} role is read-only for ${venueName}.`);
      return;
    }
    setMessage('Creating task...');
    const response = await fetch(`/api/tasks?${querySuffix}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload.error || 'Unable to create task');
      return;
    }
    setTasks((current) => [payload, ...current]);
    setForm({ title: '', owner: '', dueTime: '' });
    setMessage(`Task created for ${venueName}. Audit log recorded.`);
    startTransition(() => router.refresh());
  }

  async function patchTask(taskId: string, updates: Partial<TaskView>, successMessage: string) {
    if (!canEdit) {
      setMessage(`Your ${role.toLowerCase()} role is read-only for ${venueName}.`);
      return;
    }
    const response = await fetch(`/api/tasks/${taskId}?${querySuffix}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload.error || 'Unable to update task');
      return;
    }
    setTasks((current) => current.map((task) => task.id === taskId ? payload : task));
    setEditingId(null);
    setMessage(successMessage);
    startTransition(() => router.refresh());
  }

  function updateLocalTask(taskId: string, key: keyof TaskView, value: string) {
    setTasks((current) => current.map((task) => task.id === taskId ? { ...task, [key]: value } : task));
  }

  return (
    <div className="screen-grid two-column">
      <form className="panel-card" onSubmit={createTask}>
        <div className="panel-heading"><h3>Create task</h3></div>
        {!canEdit ? <p className="read-only-banner compact">Read-only access for this site.</p> : null}
        <fieldset disabled={!canEdit || isPending}>
          <label>Task title<input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} /></label>
          <label>Owner<input value={form.owner} onChange={(event) => setForm((current) => ({ ...current, owner: event.target.value }))} /></label>
          <label>Due time<input value={form.dueTime} onChange={(event) => setForm((current) => ({ ...current, dueTime: event.target.value }))} /></label>
          <button className="primary-button" type="submit">Add task</button>
        </fieldset>
        {message ? <p className="inline-message">{message}</p> : null}
      </form>

      <section className="panel-card">
        <div className="panel-heading"><h3>{venueName} task board</h3></div>
        <div className="stack-list">
          {tasks.length ? tasks.map((task) => {
            const editing = editingId === task.id;
            const nextStatus = task.status === 'DONE' ? 'OPEN' : 'DONE';
            return (
              <article key={task.id} className={task.status === 'DONE' ? 'task-card done' : 'task-card'}>
                <div className="task-main">
                  {editing ? (
                    <div>
                      <label>Title<input value={task.title} onChange={(event) => updateLocalTask(task.id, 'title', event.target.value)} /></label>
                      <label>Owner<input value={task.owner} onChange={(event) => updateLocalTask(task.id, 'owner', event.target.value)} /></label>
                      <label>Due time<input value={task.dueTime} onChange={(event) => updateLocalTask(task.id, 'dueTime', event.target.value)} /></label>
                    </div>
                  ) : (
                    <>
                      <strong>{task.title}</strong>
                      <div className="meta-row">
                        <span className={task.status === 'DONE' ? 'pill success' : 'pill warning'}>{task.status}</span>
                        <span>{task.owner}</span>
                        <span>{task.dueTime}</span>
                        <span>{new Date(task.updatedAt).toLocaleString()}</span>
                      </div>
                    </>
                  )}
                </div>
                <div className="button-row task-actions">
                  {editing ? (
                    <>
                      <button className="primary-button" onClick={() => patchTask(task.id, { title: task.title, owner: task.owner, dueTime: task.dueTime }, `Task updated for ${venueName}. Audit log recorded.`)} type="button">Save edit</button>
                      <button className="secondary-button" onClick={() => setEditingId(null)} type="button">Cancel</button>
                    </>
                  ) : (
                    <>
                      <button className="secondary-button" disabled={!canEdit} onClick={() => setEditingId(task.id)} type="button">Edit task</button>
                      <button className="secondary-button" disabled={!canEdit} onClick={() => patchTask(task.id, { status: nextStatus }, nextStatus === 'DONE' ? `Task completed for ${venueName}. Audit log recorded.` : `Task reopened for ${venueName}. Audit log recorded.`)} type="button">Mark {nextStatus.toLowerCase()}</button>
                    </>
                  )}
                </div>
              </article>
            );
          }) : <p className="empty-state">No tasks yet for this site.</p>}
        </div>
      </section>
    </div>
  );
}
