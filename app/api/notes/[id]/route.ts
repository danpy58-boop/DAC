import { AuditActionType, AuditEntityType } from '@prisma/client';
import { NextResponse } from 'next/server';
import { logActivity } from '@/lib/audit';
import { db } from '@/lib/db';
import { assertLocationPermission } from '@/lib/context';
import { noteUpdateSchema } from '@/lib/validators';

function selectionFromRequest(request: Request) {
  const url = new URL(request.url);
  return {
    userId: url.searchParams.get('userId') ?? undefined,
    venueId: url.searchParams.get('venueId') ?? undefined
  };
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const selection = selectionFromRequest(request);
    const context = await assertLocationPermission(selection, 'edit');
    const existing = await db.note.findFirst({ where: { id: params.id, venueId: context.selectedVenue.id } });
    if (!existing) {
      return NextResponse.json({ error: 'Note not found for selected venue' }, { status: 404 });
    }

    const body = await request.json();
    const input = noteUpdateSchema.parse(body);
    const updated = await db.note.update({
      where: { id: existing.id },
      data: input
    });

    await logActivity({
      context,
      entityType: AuditEntityType.NOTE,
      entityId: updated.id,
      action: AuditActionType.UPDATED,
      summary: `${context.currentUser.name} edited note ${updated.id.slice(-6)} for ${context.selectedVenue.name}.`,
      beforeData: existing,
      afterData: updated,
      shiftReportId: updated.shiftReportId ?? undefined,
      noteId: updated.id
    });

    return NextResponse.json({
      id: updated.id,
      category: updated.category,
      text: updated.text,
      author: updated.author,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString()
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to update note' }, { status: 400 });
  }
}
