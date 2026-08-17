import { HandoffPanel } from '@/components/handoff-panel';
import { PageHeader } from '@/components/page-header';
import { getBootstrapPayload } from '@/lib/queries';
import type { SelectionInput } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function HandoffPage({ searchParams }: { searchParams: SelectionInput }) {
  const data = await getBootstrapPayload(searchParams);

  return (
    <>
      <PageHeader
        eyebrow="Manager handoff"
        title="Shift Handoff"
        description={`Generate a venue-specific shift report for ${data.meta.selectedVenue.name}.`}
        action={
          <div className="meta-row">
            <span className="pill">{data.meta.selectedVenue.code}</span>
            <span className={data.meta.permissions.canEdit ? 'pill success' : 'pill warning'}>{data.meta.role.toLowerCase()}</span>
          </div>
        }
      />
      <HandoffPanel
        initialSummary={data.handoff}
        userId={data.meta.currentUser.id}
        venueId={data.meta.selectedVenue.id}
        venueName={data.meta.selectedVenue.name}
      />
    </>
  );
}
