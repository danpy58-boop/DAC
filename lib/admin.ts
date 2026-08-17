import { db } from '@/lib/db';
import { assertLocationPermission, pickHigherRole } from '@/lib/context';
import type { AdminPermissionsPayload, AppUserView, RegionAssignmentView, RegionView, SelectionInput, VenueAssignmentView, VenueRole, VenueView } from '@/lib/types';

function userView(user: { id: string; name: string; email: string; isPlatformAdmin: boolean }): AppUserView {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isPlatformAdmin: user.isPlatformAdmin
  };
}

function regionView(region: { id: string; name: string; code: string; venues: unknown[] }): RegionView {
  return {
    id: region.id,
    name: region.name,
    code: region.code,
    venueCount: region.venues.length
  };
}

function venueView(venue: { id: string; name: string; code: string; location: string; timezone: string; regionId: string; region: { name: string } }): VenueView {
  return {
    id: venue.id,
    regionId: venue.regionId,
    regionName: venue.region.name,
    name: venue.name,
    code: venue.code,
    location: venue.location,
    timezone: venue.timezone
  };
}

export async function getAdminPermissionsPayload(selection: SelectionInput = {}): Promise<AdminPermissionsPayload> {
  const context = await assertLocationPermission(selection, 'view');
  if (!context.permissions.canManageLocations) {
    throw new Error('Only director-level users can manage role assignments. Switch to a director or platform admin in the location context.');
  }

  const [users, regions, venues, regionAccesses, venueAccesses] = await Promise.all([
    db.user.findMany({ orderBy: [{ isPlatformAdmin: 'desc' }, { name: 'asc' }] }),
    db.region.findMany({ orderBy: { name: 'asc' }, include: { venues: true } }),
    db.venue.findMany({ orderBy: [{ name: 'asc' }], include: { region: true } }),
    db.regionAccess.findMany({ orderBy: [{ updatedAt: 'desc' }], include: { user: true, region: true } }),
    db.venueAccess.findMany({ orderBy: [{ updatedAt: 'desc' }], include: { user: true, venue: { include: { region: true } } } })
  ]);

  const regionAssignments: RegionAssignmentView[] = regionAccesses.map((access) => ({
    id: access.id,
    userId: access.userId,
    userName: access.user.name,
    userEmail: access.user.email,
    regionId: access.regionId,
    regionName: access.region.name,
    role: access.role,
    createdAt: access.createdAt.toISOString(),
    updatedAt: access.updatedAt.toISOString()
  }));

  const venueAssignments: VenueAssignmentView[] = venueAccesses.map((access) => ({
    id: access.id,
    userId: access.userId,
    userName: access.user.name,
    userEmail: access.user.email,
    venueId: access.venueId,
    venueName: access.venue.name,
    regionName: access.venue.region.name,
    role: access.role,
    createdAt: access.createdAt.toISOString(),
    updatedAt: access.updatedAt.toISOString()
  }));

  const effectivePermissions = users.flatMap((user) => {
    return venues.flatMap((venue) => {
      if (user.isPlatformAdmin) {
        return [{
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          venueId: venue.id,
          venueName: venue.name,
          regionName: venue.region.name,
          role: 'DIRECTOR' as VenueRole,
          source: 'Platform admin'
        }];
      }

      const regionRole = regionAccesses.find((access) => access.userId === user.id && access.regionId === venue.regionId)?.role;
      const venueRole = venueAccesses.find((access) => access.userId === user.id && access.venueId === venue.id)?.role;
      const effectiveRole = pickHigherRole(regionRole, venueRole);
      if (!effectiveRole) {
        return [];
      }

      return [{
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        venueId: venue.id,
        venueName: venue.name,
        regionName: venue.region.name,
        role: effectiveRole,
        source: regionRole && venueRole ? 'Region + venue override' : venueRole ? 'Venue override' : 'Region access'
      }];
    });
  });

  return {
    meta: {
      actor: context.currentUser,
      selectedVenue: context.selectedVenue,
      canManageLocations: context.permissions.canManageLocations
    },
    users: users.map(userView),
    regions: regions.map(regionView),
    venues: venues.map(venueView),
    regionAssignments,
    venueAssignments,
    effectivePermissions
  };
}
