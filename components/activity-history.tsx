import type { ActivityLogView } from '@/lib/types';

type Props = {
  activity: ActivityLogView[];
  title?: string;
};

const actionTone: Record<string, string> = {
  CREATED: 'pill',
  UPDATED: 'pill',
  COMPLETED: 'pill success',
  REOPENED: 'pill warning',
  DELETED: 'pill warning'
};

export function ActivityHistory({ activity, title = 'Activity history' }: Props) {
  return (
    <section className="panel-card">
      <div className="panel-heading"><h3>{title}</h3></div>
      <div className="stack-list">
        {activity.length ? activity.map((item) => (
          <article key={item.id} className="stack-card">
            <div className="meta-row">
              <span className={actionTone[item.action] ?? 'pill'}>{item.action.toLowerCase()}</span>
              <span className="pill">{item.entityType.toLowerCase().replace('_', ' ')}</span>
              <span>{item.actorName}</span>
              <span>{new Date(item.createdAt).toLocaleString()}</span>
            </div>
            <p>{item.summary}</p>
            {item.actorEmail ? <p className="supporting-text small-text">{item.actorEmail}</p> : null}
          </article>
        )) : <p className="empty-state">No activity recorded yet.</p>}
      </div>
    </section>
  );
}
