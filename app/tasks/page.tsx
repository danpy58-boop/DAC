import { PageHeader } from '@/components/page-header';
import { TaskBoard } from '@/components/task-board';
import { getBootstrapPayload } from '@/lib/queries';
import type { SelectionInput } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function TasksPage({ searchParams }: { searchParams: SelectionInput }) {
  const data = await getBootstrapPayload(searchParams);

  return (
    <>
      <PageHeader
        eyebrow="Execution layer"
        title="Task Board"
        description={`Assign operational follow-ups and ownership for ${data.meta.selectedVenue.name}.`}
        action={<span className={data.meta.permissions.canEdit ? 'pill success' : 'pill warning'}>{data.meta.role.toLowerCase()}</span>}
      />
      <TaskBoard
        initialTasks={data.tasks}
        userId={data.meta.currentUser.id}
        venueId={data.meta.selectedVenue.id}
        canEdit={data.meta.permissions.canEdit}
        venueName={data.meta.selectedVenue.name}
        role={data.meta.role}
      />
    </>
  );
}
