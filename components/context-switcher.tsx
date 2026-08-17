'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { AppUserView, VenueRole, VenueView } from '@/lib/types';

type ContextPayload = {
  currentUser: AppUserView;
  role: VenueRole;
  selectedVenue: VenueView;
  accessibleVenues: VenueView[];
  availableUsers: AppUserView[];
  permissions: {
    canView: boolean;
    canEdit: boolean;
    canManageLocations: boolean;
  };
};

export function ContextSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [context, setContext] = useState<ContextPayload | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    return params.toString();
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    const suffix = queryString ? `?${queryString}` : '';
    fetch(`/api/context${suffix}`)
      .then((response) => response.json())
      .then((payload) => {
        if (active) setContext(payload);
      })
      .catch(() => {
        if (active) setContext(null);
      });

    return () => {
      active = false;
    };
  }, [queryString]);

  function pushSelection(nextUserId?: string, nextVenueId?: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextUserId) {
      params.set('userId', nextUserId);
      params.delete('venueId');
    }
    if (nextVenueId) {
      params.set('venueId', nextVenueId);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  if (!context) {
    return <div className="context-panel"><p className="supporting-text">Loading location context...</p></div>;
  }

  return (
    <div className="context-panel">
      <div className="context-header">
        <strong>Location context</strong>
        <span className={context.permissions.canEdit ? 'pill success' : 'pill warning'}>
          {context.role.toLowerCase()}
        </span>
      </div>

      <label>
        User
        <select value={context.currentUser.id} onChange={(event) => pushSelection(event.target.value)}>
          {context.availableUsers.map((user) => (
            <option key={user.id} value={user.id}>{user.name}</option>
          ))}
        </select>
      </label>

      <label>
        Venue
        <select value={context.selectedVenue.id} onChange={(event) => pushSelection(undefined, event.target.value)}>
          {context.accessibleVenues.map((venue) => (
            <option key={venue.id} value={venue.id}>{venue.name}</option>
          ))}
        </select>
      </label>

      <div className="supporting-text small-text">
        {context.selectedVenue.location} • {context.selectedVenue.timezone}
      </div>
      <div className="supporting-text small-text">
        {context.permissions.canEdit ? 'Edit access enabled for this site.' : 'Read-only access for this site.'}
      </div>
    </div>
  );
}
