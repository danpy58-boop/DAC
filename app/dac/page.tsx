import { DacForm } from '@/components/dac-form';
import { PageHeader } from '@/components/page-header';
import { getBootstrapPayload } from '@/lib/queries';
import type { SelectionInput } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function DailyActionCardPage({ searchParams }: { searchParams: SelectionInput }) {
  const data = await getBootstrapPayload(searchParams);

  return (
    <>
      <PageHeader
        eyebrow="Structured shift log"
        title="Daily Action Card"
        description={`Capture operating metrics, service issues, and handoff actions for ${data.meta.selectedVenue.name}. Offline saves sync automatically when connection returns.`}
        action={<span className={data.meta.permissions.canEdit ? 'pill success' : 'pill warning'}>{data.meta.role.toLowerCase()}</span>}
      />
      <DacForm
        initialReport={data.dacCurrent}
        userId={data.meta.currentUser.id}
        currentUserName={data.meta.currentUser.name}
        venueId={data.meta.selectedVenue.id}
        canEdit={data.meta.permissions.canEdit}
        venueName={data.meta.selectedVenue.name}
        role={data.meta.role}
      />
    </>
  );
}
