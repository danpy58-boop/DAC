import { NextResponse } from 'next/server';
import { getAdminPermissionsPayload } from '@/lib/admin';
import { assertLocationPermission } from '@/lib/context';
import { db } from '@/lib/db';
import { adminPermissionDeleteSchema, adminPermissionUpsertSchema } from '@/lib/validators';

function selectionFromRequest(request: Request) {
  const url = new URL(request.url);
  return {
    userId: url.searchParams.get('userId') ?? undefined,
    venueId: url.searchParams.get('venueId') ?? undefined
  };
}

async function assertAdminPermission(request: Request) {
  const selection = selectionFromRequest(request);
  const context = await assertLocationPermission(selection, 'view');
  if (!context.permissions.canManageLocations) {
    throw new Error('Only director-level users can manage role assignments.');
  }
  return selection;
}

export async function GET(request: Request) {
  try {
    const selection = await assertAdminPermission(request);
    const payload = await getAdminPermissionsPayload(selection);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load admin permissions' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const selection = await assertAdminPermission(request);
    const body = await request.json();
    const input = adminPermissionUpsertSchema.parse(body);

    if (input.scope === 'REGION') {
      await db.regionAccess.upsert({
        where: {
          userId_regionId: {
            userId: input.targetUserId,
            regionId: input.regionId!
          }
        },
        update: { role: input.role },
        create: {
          userId: input.targetUserId,
          regionId: input.regionId!,
          role: input.role
        }
      });
    } else {
      await db.venueAccess.upsert({
        where: {
          userId_venueId: {
            userId: input.targetUserId,
            venueId: input.venueId!
          }
        },
        update: { role: input.role },
        create: {
          userId: input.targetUserId,
          venueId: input.venueId!,
          role: input.role
        }
      });
    }

    const payload = await getAdminPermissionsPayload(selection);
    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to save role assignment' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const selection = await assertAdminPermission(request);
    const body = await request.json();
    const input = adminPermissionDeleteSchema.parse(body);

    if (input.scope === 'REGION') {
      await db.regionAccess.delete({ where: { id: input.accessId } });
    } else {
      await db.venueAccess.delete({ where: { id: input.accessId } });
    }

    const payload = await getAdminPermissionsPayload(selection);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to delete role assignment' }, { status: 400 });
  }
}
