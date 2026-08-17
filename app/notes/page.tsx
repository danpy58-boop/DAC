import { NotesManager } from '@/components/notes-manager';
import { PageHeader } from '@/components/page-header';
import { getBootstrapPayload } from '@/lib/queries';
import type { SelectionInput } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function NotesPage({ searchParams }: { searchParams: SelectionInput }) {
  const data = await getBootstrapPayload(searchParams);

  return (
    <>
      <PageHeader
        eyebrow="Real-time floor notes"
        title="Live Notes"
        description={`Log operational issues, service recoveries, and staffing changes for ${data.meta.selectedVenue.name}, even when the device is offline.`}
        action={<span className={data.meta.permissions.canEdit ? 'pill success' : 'pill warning'}>{data.meta.role.toLowerCase()}</span>}
      />
      <NotesManager
        initialNotes={data.notes}
        userId={data.meta.currentUser.id}
        venueId={data.meta.selectedVenue.id}
        canEdit={data.meta.permissions.canEdit}
        venueName={data.meta.selectedVenue.name}
        role={data.meta.role}
      />
    </>
  );
}
