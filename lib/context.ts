import { VenueRole } from '@prisma/client';
import { db } from '@/lib/db';
import type { AppUserView, RegionView, ResolvedContext, SelectionInput, VenueView } from '@/lib/types';

const editableRoles = new Set<VenueRole>(['SUPERVISOR', 'MANAGER', 'DIRECTOR']);
const roleRank: Record<VenueRole, number> = {
  VIEWER: 1,
  SUPERVISOR: 2,
  MANAGER: 3,
  DIRECTOR: 4
};

function takeFirst(value?: string | string[]) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function userView(user: { id: string; name: string; email: string; isPlatformAdmin: boolean }): AppUserView {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isPlatformAdmin: user.isPlatformAdmin
  };
}

function regionView(region: { id: string; name: string; code: string }, venueCount: number): RegionView {
  return {
    id: region.id,
    name: region.name,
    code: region.code,
    venueCount
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

export function pickHigherRole(...roles: Array<VenueRole | null | undefined>): VenueRole | null {
  const filtered = roles.filter(Boolean) as VenueRole[];
  if (!filtered.length) return null;
  return filtered.sort((left, right) => roleRank[right] - roleRank[left])[0];
}

export async function resolveSelectionContext(selection: SelectionInput = {}): Promise<ResolvedContext> {
  const [users, venues] = await Promise.all([
    db.user.findMany({ orderBy: { createdAt: 'asc' }, include: { regionAccesses: true, venueAccesses: true } }),
    db.venue.findMany({ orderBy: { createdAt: 'asc' }, include: { region: true } })
  ]);

  if (!users.length) {
    throw new Error('No users found. Run the Prisma seed script first.');
  }

  if (!venues.length) {
    throw new Error('No venues found. Run the Prisma seed script first.');
  }

  const requestedUserId = takeFirst(selection.userId);
  const selectedUser = users.find((user) => user.id === requestedUserId) ?? users[0];

  const accessibleVenueRecords = selectedUser.isPlatformAdmin
    ? venues
    : venues.filter((venue) => selectedUser.regionAccesses.some((access) => access.regionId === venue.regionId) || selectedUser.venueAccesses.some((access) => access.venueId === venue.id));

  if (!accessibleVenueRecords.length) {
    throw new Error(`User ${selectedUser.name} has no venue access configured.`);
  }

  const requestedVenueId = takeFirst(selection.venueId);
  const selectedVenueRecord = accessibleVenueRecords.find((venue) => venue.id === requestedVenueId) ?? accessibleVenueRecords[0];
  const directRole = selectedUser.venueAccesses.find((access) => access.venueId === selectedVenueRecord.id)?.role;
  const regionRole = selectedUser.regionAccesses.find((access) => access.regionId === selectedVenueRecord.regionId)?.role;
  const role = selectedUser.isPlatformAdmin ? 'DIRECTOR' : (pickHigherRole(directRole, regionRole) ?? 'VIEWER');

  const regionVenueCounts = new Map<string, number>();
  for (const venue of accessibleVenueRecords) {
    regionVenueCounts.set(venue.regionId, (regionVenueCounts.get(venue.regionId) ?? 0) + 1);
  }

  const accessibleRegions = Array.from(new Map(accessibleVenueRecords.map((venue) => [venue.regionId, regionView(venue.region, regionVenueCounts.get(venue.regionId) ?? 1)])).values());

  return {
    currentUser: userView(selectedUser),
    role,
    permissions: {
      canView: true,
      canEdit: editableRoles.has(role),
      canManageLocations: role === 'DIRECTOR' || selectedUser.isPlatformAdmin
    },
    selectedVenue: venueView(selectedVenueRecord),
    accessibleVenues: accessibleVenueRecords.map(venueView),
    accessibleRegions,
    availableUsers: users.map(userView)
  };
}

export async function assertLocationPermission(selection: SelectionInput, required: 'view' | 'edit') {
  const context = await resolveSelectionContext(selection);
  if (required === 'edit' && !context.permissions.canEdit) {
    throw new Error(`User ${context.currentUser.name} has read-only access to ${context.selectedVenue.name}.`);
  }
  return context;
}
