import { ActivityHistory } from '@/components/activity-history';
import { PageHeader } from '@/components/page-header';
import { getBootstrapPayload } from '@/lib/queries';
import type { SelectionInput } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function DashboardPage({ searchParams }: { searchParams: SelectionInput }) {
  const data = await getBootstrapPayload(searchParams);

  const stats = [
    { label: 'Open tables', value: data.summary.openTables },
    { label: 'Covers booked', value: data.summary.coversBooked },
    { label: 'Labor %', value: `${data.summary.laborPercent}%` },
    { label: 'Sales today', value: `$${data.summary.salesToday}` },
    { label: 'Open issues', value: data.summary.issuesOpen }
  ];

  return (
    <>
      <PageHeader
        eyebrow="Operations command center"
        title="Dashboard"
        description="Track service pressure, venue-specific metrics, permissions, and recent audit history for the selected site."
        action={
          <div className="meta-row">
            <span className="pill">{data.meta.selectedVenue.name}</span>
            <span className="pill">{data.meta.currentUser.name}</span>
            <span className={data.meta.permissions.canEdit ? 'pill success' : 'pill warning'}>{data.meta.role.toLowerCase()}</span>
          </div>
        }
      />

      <section className="info-grid" style={{ marginBottom: 18 }}>
        <article className="info-card">
          <strong>Selected site</strong>
          <p>{data.meta.selectedVenue.name} • {data.meta.selectedVenue.location}</p>
        </article>
        <article className="info-card">
          <strong>Current user</strong>
          <p>{data.meta.currentUser.name} • {data.meta.currentUser.email}</p>
        </article>
        <article className="info-card">
          <strong>Daily Action Card</strong>
          <p>{data.dacCurrent.isCompleted ? `Completed by ${data.dacCurrent.completedByName || 'Unknown'}` : 'In progress'}</p>
        </article>
      </section>

      <section className="stats-grid">
        {stats.map((stat) => (
          <article key={stat.label} className="stat-card">
            <p>{stat.label}</p>
            <strong>{stat.value}</strong>
          </article>
        ))}
      </section>

      <section className="screen-grid two-column">
        <article className="panel-card">
          <div className="panel-heading"><h3>Site snapshot</h3></div>
          <div className="stack-list">
            <div className="stack-card"><strong>Venue</strong><p>{data.meta.restaurantName} • {data.meta.location}</p></div>
            <div className="stack-card"><strong>Current shift</strong><p>{data.dacCurrent.shift} • {data.dacCurrent.businessDate}</p></div>
            <div className="stack-card"><strong>Manager on duty</strong><p>{data.dacCurrent.manager}</p></div>
            <div className="stack-card"><strong>Dining room / bar</strong><p>{data.summary.diningStatus} / {data.summary.barStatus}</p></div>
            <div className="stack-card"><strong>Outages</strong><p>{data.dacCurrent.outages.length ? data.dacCurrent.outages.join(', ') : 'No outages logged'}</p></div>
          </div>
        </article>

        <ActivityHistory activity={data.recentActivity} title="Recent activity" />
      </section>
    </>
  );
}
