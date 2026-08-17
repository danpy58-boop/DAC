import { AdminRoleManager } from '@/components/admin-role-manager';
import { PageHeader } from '@/components/page-header';
import { getAdminPermissionsPayload } from '@/lib/admin';
import type { SelectionInput } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AdminPage({ searchParams }: { searchParams: SelectionInput }) {
  try {
    const data = await getAdminPermissionsPayload(searchParams);

    return (
      <>
        <PageHeader
          eyebrow="Deployment controls"
          title="Role Management"
          description="Assign region-wide access, venue overrides, and final deployment permissions by user, role, and region."
          action={
            <div className="meta-row">
              <span className="pill">{data.meta.actor.name}</span>
              <span className="pill">{data.meta.selectedVenue.name}</span>
              <span className="pill success">director access</span>
            </div>
          }
        />
        <AdminRoleManager initialData={data} actorUserId={data.meta.actor.id} actorVenueId={data.meta.selectedVenue.id} />
      </>
    );
  } catch (error) {
    return (
      <>
        <PageHeader
          eyebrow="Deployment controls"
          title="Role Management"
          description="Switch to a director-level context to assign region and venue permissions."
        />
        <section className="panel-card">
          <p className="read-only-banner compact">{error instanceof Error ? error.message : 'Role management is unavailable for the current context.'}</p>
          <p className="supporting-text">Use the location context switcher in the sidebar to select a platform admin or director, then reload this screen.</p>
        </section>
      </>
    );
  }
}
