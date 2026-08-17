'use client';

import { useMemo, useState } from 'react';

type Props = {
  initialSummary: {
    generatedAt: string;
    openTaskCount: number;
    noteCount: number;
    outages: string[];
    summaryText: string;
  };
  userId: string;
  venueId: string;
  venueName: string;
};

export function HandoffPanel({ initialSummary, userId, venueId, venueName }: Props) {
  const [summary, setSummary] = useState(initialSummary);
  const [message, setMessage] = useState('');
  const querySuffix = useMemo(() => new URLSearchParams({ userId, venueId }).toString(), [userId, venueId]);

  async function rebuildSummary() {
    setMessage('Rebuilding summary...');
    const response = await fetch(`/api/handoff/build?${querySuffix}`, { method: 'POST' });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload.error || 'Unable to rebuild handoff');
      return;
    }
    setSummary(payload);
    setMessage(`Handoff rebuilt for ${venueName}.`);
  }

  return (
    <section className="panel-card">
      <div className="panel-heading space-between">
        <div>
          <h3>Shift handoff summary</h3>
          <p className="supporting-text">Generated: {new Date(summary.generatedAt).toLocaleString()}</p>
        </div>
        <button className="primary-button" onClick={rebuildSummary} type="button">Rebuild summary</button>
      </div>
      <div className="meta-row">
        <span className="pill warning">Open tasks: {summary.openTaskCount}</span>
        <span className="pill">Notes: {summary.noteCount}</span>
        <span className="pill">Outages: {summary.outages.length}</span>
        <span className="pill">Site: {venueName}</span>
      </div>
      <pre className="handoff-box">{summary.summaryText}</pre>
      <p className="supporting-text small-text" style={{ marginTop: 12 }}>Daily Action Card completion is included in the generated handoff summary and recorded in activity history.</p>
      {message ? <p className="inline-message">{message}</p> : null}
    </section>
  );
}
