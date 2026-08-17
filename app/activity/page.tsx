import { ActivityHistory } from '@/components/activity-history';
import { PageHeader } from '@/components/page-header';
import { getBootstrapPayload, getActivityForVenue } from '@/lib/queries';
import type { SelectionInput } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ActivityPage({ searchParams }: { searchParams: SelectionInput }) {
  const [data, activity] = await Promise.all([
    getBootstrapPayload(searchParams),
    getActivityForVenue(searchParams, 60)
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Audit trail"
        title="Activity History"
        description={`Track who created, edited, completed, reopened, or deleted operational records for ${data.meta.selectedVenue.name}.`}
        action={
          <div className="meta-row">
            <span className="pill">{data.meta.selectedVenue.name}</span>
            <span className={data.meta.permissions.canEdit ? 'pill success' : 'pill warning'}>{data.meta.role.toLowerCase()}</span>
          </div>
        }
      />
      <ActivityHistory activity={activity} />
    </>
  );
}
