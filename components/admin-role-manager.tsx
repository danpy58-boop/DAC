'use client';

import { useMemo, useState } from 'react';
import type { AdminPermissionsPayload, VenueRole } from '@/lib/types';

type Props = {
  initialData: AdminPermissionsPayload;
  actorUserId: string;
  actorVenueId: string;
};

const roles: VenueRole[] = ['VIEWER', 'SUPERVISOR', 'MANAGER', 'DIRECTOR'];

export function AdminRoleManager({ initialData, actorUserId, actorVenueId }: Props) {
  const [data, setData] = useState(initialData);
  const [regionForm, setRegionForm] = useState({
    targetUserId: initialData.users[0]?.id ?? '',
    regionId: initialData.regions[0]?.id ?? '',
    role: 'MANAGER' as VenueRole
  });
  const [venueForm, setVenueForm] = useState({
    targetUserId: initialData.users[0]?.id ?? '',
    venueId: initialData.venues[0]?.id ?? '',
    role: 'SUPERVISOR' as VenueRole
  });
  const [message, setMessage] = useState('');
  const querySuffix = useMemo(() => new URLSearchParams({ userId: actorUserId, venueId: actorVenueId }).toString(), [actorUserId, actorVenueId]);

  async function persist(method: 'POST' | 'DELETE', body: Record<string, string>) {
    const response = await fetch(`/api/admin/permissions?${querySuffix}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload.error || 'Unable to save permission change');
      return;
    }
    setData(payload);
    setMessage(method === 'DELETE' ? 'Assignment removed.' : 'Permissions updated successfully.');
  }

  return (
    <div className="screen-grid">
      <section className="panel-card">
        <div className="panel-heading">
          <h3>Deployment access summary</h3>
          <span className="pill">{data.effectivePermissions.length} effective assignments</span>
        </div>
        <div className="info-grid">
          <article className="info-card"><strong>Acting admin</strong><p>{data.meta.actor.name} • {data.meta.actor.email}</p></article>
          <article className="info-card"><strong>Regions</strong><p>{data.regions.length} configured</p></article>
          <article className="info-card"><strong>Venues</strong><p>{data.venues.length} configured</p></article>
        </div>
        {message ? <p className="inline-message">{message}</p> : null}
      </section>

      <div className="permission-grid">
        <form className="panel-card" onSubmit={(event) => {
          event.preventDefault();
          persist('POST', { scope: 'REGION', ...regionForm });
        }}>
          <div className="panel-heading"><h3>Assign by region</h3></div>
          <div className="form-grid">
            <label>User<select value={regionForm.targetUserId} onChange={(event) => setRegionForm((current) => ({ ...current, targetUserId: event.target.value }))}>{data.users.map((user) => <option key={user.id} value={user.id}>{user.name}{user.isPlatformAdmin ? ' (platform admin)' : ''}</option>)}</select></label>
            <label>Region<select value={regionForm.regionId} onChange={(event) => setRegionForm((current) => ({ ...current, regionId: event.target.value }))}>{data.regions.map((region) => <option key={region.id} value={region.id}>{region.name} ({region.venueCount} venues)</option>)}</select></label>
            <label>Role<select value={regionForm.role} onChange={(event) => setRegionForm((current) => ({ ...current, role: event.target.value as VenueRole }))}>{roles.map((role) => <option key={role} value={role}>{role}</option>)}</select></label>
          </div>
          <button className="primary-button" type="submit">Save region assignment</button>
        </form>

        <form className="panel-card" onSubmit={(event) => {
          event.preventDefault();
          persist('POST', { scope: 'VENUE', ...venueForm });
        }}>
          <div className="panel-heading"><h3>Assign by venue</h3></div>
          <div className="form-grid">
            <label>User<select value={venueForm.targetUserId} onChange={(event) => setVenueForm((current) => ({ ...current, targetUserId: event.target.value }))}>{data.users.map((user) => <option key={user.id} value={user.id}>{user.name}{user.isPlatformAdmin ? ' (platform admin)' : ''}</option>)}</select></label>
            <label>Venue<select value={venueForm.venueId} onChange={(event) => setVenueForm((current) => ({ ...current, venueId: event.target.value }))}>{data.venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name} • {venue.regionName}</option>)}</select></label>
            <label>Role<select value={venueForm.role} onChange={(event) => setVenueForm((current) => ({ ...current, role: event.target.value as VenueRole }))}>{roles.map((role) => <option key={role} value={role}>{role}</option>)}</select></label>
          </div>
          <button className="primary-button" type="submit">Save venue override</button>
        </form>
      </div>

      <div className="permission-grid">
        <section className="panel-card">
          <div className="panel-heading"><h3>Region assignments</h3></div>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead><tr><th>User</th><th>Region</th><th>Role</th><th>Updated</th><th></th></tr></thead>
              <tbody>
                {data.regionAssignments.length ? data.regionAssignments.map((assignment) => (
                  <tr key={assignment.id}>
                    <td><strong>{assignment.userName}</strong><div className="supporting-text small-text">{assignment.userEmail}</div></td>
                    <td>{assignment.regionName}</td>
                    <td><span className="pill">{assignment.role}</span></td>
                    <td>{new Date(assignment.updatedAt).toLocaleString()}</td>
                    <td><button className="secondary-button" type="button" onClick={() => persist('DELETE', { scope: 'REGION', accessId: assignment.id })}>Remove</button></td>
                  </tr>
                )) : <tr><td colSpan={5}>No region assignments configured.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel-card">
          <div className="panel-heading"><h3>Venue overrides</h3></div>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead><tr><th>User</th><th>Venue</th><th>Role</th><th>Updated</th><th></th></tr></thead>
              <tbody>
                {data.venueAssignments.length ? data.venueAssignments.map((assignment) => (
                  <tr key={assignment.id}>
                    <td><strong>{assignment.userName}</strong><div className="supporting-text small-text">{assignment.userEmail}</div></td>
                    <td>{assignment.venueName}<div className="supporting-text small-text">{assignment.regionName}</div></td>
                    <td><span className="pill warning">{assignment.role}</span></td>
                    <td>{new Date(assignment.updatedAt).toLocaleString()}</td>
                    <td><button className="secondary-button" type="button" onClick={() => persist('DELETE', { scope: 'VENUE', accessId: assignment.id })}>Remove</button></td>
                  </tr>
                )) : <tr><td colSpan={5}>No venue overrides configured.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="panel-card">
        <div className="panel-heading"><h3>Effective access matrix</h3></div>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead><tr><th>User</th><th>Venue</th><th>Region</th><th>Role</th><th>Source</th></tr></thead>
            <tbody>
              {data.effectivePermissions.map((item) => (
                <tr key={`${item.userId}-${item.venueId}`}>
                  <td><strong>{item.userName}</strong><div className="supporting-text small-text">{item.userEmail}</div></td>
                  <td>{item.venueName}</td>
                  <td>{item.regionName}</td>
                  <td><span className={item.role === 'DIRECTOR' ? 'pill success' : 'pill'}>{item.role}</span></td>
                  <td>{item.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
