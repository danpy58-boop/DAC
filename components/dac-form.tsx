'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { enqueueOfflineAction } from '@/lib/offline-sync-client';
import type { ShiftReportView } from '@/lib/types';

type Props = {
  initialReport: ShiftReportView;
  userId: string;
  currentUserName: string;
  venueId: string;
  canEdit: boolean;
  venueName: string;
  role: string;
};

export function DacForm({ initialReport, userId, currentUserName, venueId, canEdit, venueName, role }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    businessDate: initialReport.businessDate,
    shift: initialReport.shift,
    location: initialReport.location,
    manager: initialReport.manager,
    openTables: initialReport.openTables,
    coversBooked: initialReport.coversBooked,
    laborPercent: initialReport.laborPercent,
    salesToday: initialReport.salesToday,
    diningStatus: initialReport.diningStatus,
    barStatus: initialReport.barStatus,
    events: initialReport.events,
    outages: initialReport.outages.join(', '),
    guestIssues: initialReport.guestIssues,
    actions: initialReport.actions,
    ownerDue: initialReport.ownerDue,
    followup: initialReport.followup,
    checklist: initialReport.checklist
  });
  const [message, setMessage] = useState('');
  const [completion, setCompletion] = useState({
    isCompleted: initialReport.isCompleted,
    completedAt: initialReport.completedAt,
    completedByName: initialReport.completedByName
  });

  const querySuffix = useMemo(() => {
    const params = new URLSearchParams({ userId, venueId });
    return params.toString();
  }, [userId, venueId]);

  function updateField(key: string, value: string | number | boolean) {
    if (key in form.checklist && typeof value === 'boolean') {
      setForm((current) => ({
        ...current,
        checklist: { ...current.checklist, [key]: value }
      }));
      return;
    }
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function queueCurrentCard(payload: unknown) {
    await enqueueOfflineAction({
      url: `/api/dac/current?${querySuffix}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      entityLabel: 'daily-action-card',
      summary: `Offline save queued for ${venueName}`
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit) {
      setMessage(`Your ${role.toLowerCase()} role is read-only for ${venueName}.`);
      return;
    }

    const payload = {
      ...form,
      outages: form.outages.split(',').map((item) => item.trim()).filter(Boolean)
    };

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await queueCurrentCard(payload);
      setCompletion({ isCompleted: false, completedAt: null, completedByName: null });
      setMessage(`Saved offline for ${venueName}. It will sync automatically when back online.`);
      return;
    }

    setMessage('Saving...');
    try {
      const response = await fetch(`/api/dac/current?${querySuffix}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json();
        setMessage(error.error || 'Unable to save report');
        return;
      }

      setCompletion({ isCompleted: false, completedAt: null, completedByName: null });
      setMessage(`Daily action card saved for ${venueName}. Audit log recorded.`);
      startTransition(() => router.refresh());
    } catch {
      await queueCurrentCard(payload);
      setCompletion({ isCompleted: false, completedAt: null, completedByName: null });
      setMessage(`Connection failed. Saved offline for ${venueName} and queued for sync.`);
    }
  }

  async function markComplete() {
    if (!canEdit) {
      setMessage(`Your ${role.toLowerCase()} role is read-only for ${venueName}.`);
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await enqueueOfflineAction({
        url: `/api/dac/complete?${querySuffix}`,
        method: 'POST',
        entityLabel: 'daily-action-card',
        summary: `Offline completion queued for ${venueName}`
      });
      const completedAt = new Date().toISOString();
      setCompletion({ isCompleted: true, completedAt, completedByName: currentUserName });
      setMessage(`Completion saved offline for ${venueName}. It will sync automatically when back online.`);
      return;
    }

    setMessage('Completing Daily Action Card...');
    try {
      const response = await fetch(`/api/dac/complete?${querySuffix}`, { method: 'POST' });
      const payload = await response.json();
      if (!response.ok) {
        setMessage(payload.error || 'Unable to complete Daily Action Card');
        return;
      }
      setCompletion({
        isCompleted: Boolean(payload.isCompleted),
        completedAt: payload.completedAt ? new Date(payload.completedAt).toISOString() : null,
        completedByName: payload.completedByName ?? null
      });
      setMessage(`Daily action card completed for ${venueName}. Audit log recorded.`);
      startTransition(() => router.refresh());
    } catch {
      await enqueueOfflineAction({
        url: `/api/dac/complete?${querySuffix}`,
        method: 'POST',
        entityLabel: 'daily-action-card',
        summary: `Offline completion queued for ${venueName}`
      });
      const completedAt = new Date().toISOString();
      setCompletion({ isCompleted: true, completedAt, completedByName: currentUserName });
      setMessage(`Connection failed. Completion was queued offline for ${venueName}.`);
    }
  }

  return (
    <form className="screen-grid two-column" onSubmit={handleSubmit}>
      <div className="field-grid-span info-grid">
        <article className="info-card">
          <strong>Daily Action Card status</strong>
          <p>{completion.isCompleted ? `Completed by ${completion.completedByName || 'Unknown'}${completion.completedAt ? ` on ${new Date(completion.completedAt).toLocaleString()}` : ''}` : 'In progress'}</p>
        </article>
        <article className="info-card">
          <strong>Offline support</strong>
          <p>Daily Action Card saves and completions queue locally when internet is unavailable.</p>
        </article>
      </div>
      {!canEdit ? <div className="read-only-banner">Read-only access: {role.toLowerCase()} users can view this site's Daily Action Card but cannot edit it.</div> : null}
      <fieldset className="field-grid-span" disabled={!canEdit || isPending}>
        <div className="screen-grid two-column">
          <section className="panel-card">
            <div className="panel-heading"><h3>Shift details</h3></div>
            <label>Business date<input type="date" value={form.businessDate} onChange={(event) => updateField('businessDate', event.target.value)} /></label>
            <label>Location<input value={form.location} onChange={(event) => updateField('location', event.target.value)} /></label>
            <label>Shift<select value={form.shift} onChange={(event) => updateField('shift', event.target.value)}><option>Breakfast</option><option>Lunch</option><option>Dinner</option><option>Late Night</option></select></label>
            <label>Manager on duty<input value={form.manager} onChange={(event) => updateField('manager', event.target.value)} /></label>
            <label>Reservations / events<textarea rows={4} value={form.events} onChange={(event) => updateField('events', event.target.value)} /></label>
          </section>

          <section className="panel-card">
            <div className="panel-heading"><h3>Trading metrics</h3></div>
            <label>Open tables<input type="number" value={form.openTables} onChange={(event) => updateField('openTables', Number(event.target.value))} /></label>
            <label>Covers booked<input type="number" value={form.coversBooked} onChange={(event) => updateField('coversBooked', Number(event.target.value))} /></label>
            <label>Labor %<input type="number" step="0.1" value={form.laborPercent} onChange={(event) => updateField('laborPercent', Number(event.target.value))} /></label>
            <label>Sales today<input type="number" value={form.salesToday} onChange={(event) => updateField('salesToday', Number(event.target.value))} /></label>
            <label>Dining room<select value={form.diningStatus} onChange={(event) => updateField('diningStatus', event.target.value)}><option>On Track</option><option>Busy</option><option>Behind</option><option>Recovery Needed</option></select></label>
            <label>Bar<select value={form.barStatus} onChange={(event) => updateField('barStatus', event.target.value)}><option>On Track</option><option>Busy</option><option>Behind</option><option>Recovery Needed</option></select></label>
          </section>

          <section className="panel-card">
            <div className="panel-heading"><h3>Checklist + issues</h3></div>
            <label className="checkbox-row"><input type="checkbox" checked={form.checklist.preShiftCompleted} onChange={(event) => updateField('preShiftCompleted', event.target.checked)} />Pre-shift completed</label>
            <label className="checkbox-row"><input type="checkbox" checked={form.checklist.cashDrawersVerified} onChange={(event) => updateField('cashDrawersVerified', event.target.checked)} />Cash drawers verified</label>
            <label className="checkbox-row"><input type="checkbox" checked={form.checklist.barStocked} onChange={(event) => updateField('barStocked', event.target.checked)} />Bar stocked</label>
            <label className="checkbox-row"><input type="checkbox" checked={form.checklist.cleanlinessWalkDone} onChange={(event) => updateField('cleanlinessWalkDone', event.target.checked)} />Cleanliness walk done</label>
            <label className="checkbox-row"><input type="checkbox" checked={form.checklist.closingPlanAssigned} onChange={(event) => updateField('closingPlanAssigned', event.target.checked)} />Closing plan assigned</label>
            <label>86 list / outages<textarea rows={4} value={form.outages} onChange={(event) => updateField('outages', event.target.value)} /></label>
            <label>Guest issues / recoveries<textarea rows={4} value={form.guestIssues} onChange={(event) => updateField('guestIssues', event.target.value)} /></label>
          </section>

          <section className="panel-card">
            <div className="panel-heading"><h3>Actions + follow-up</h3></div>
            <label>Immediate actions<textarea rows={4} value={form.actions} onChange={(event) => updateField('actions', event.target.value)} /></label>
            <label>Owner + due time<input value={form.ownerDue} onChange={(event) => updateField('ownerDue', event.target.value)} /></label>
            <label>Tomorrow follow-up<textarea rows={4} value={form.followup} onChange={(event) => updateField('followup', event.target.value)} /></label>
            <div className="button-row">
              <button className="primary-button" type="submit">{isPending ? 'Saving...' : `Save ${venueName} card`}</button>
              <button className="secondary-button" disabled={completion.isCompleted} onClick={markComplete} type="button">Mark complete</button>
            </div>
          </section>
        </div>
      </fieldset>
      {message ? <p className="inline-message field-grid-span">{message}</p> : null}
    </form>
  );
}
