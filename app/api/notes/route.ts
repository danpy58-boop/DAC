import { AuditActionType, AuditEntityType } from '@prisma/client';
import { NextResponse } from 'next/server';
import { logActivity } from '@/lib/audit';
import { db } from '@/lib/db';
import { assertLocationPermission } from '@/lib/context';
import { getCurrentShiftReportRecord, getNotesForCurrentShift } from '@/lib/queries';
import { noteInputSchema } from '@/lib/validators';

function selectionFromRequest(request: Request) {
  const url = new URL(request.url);
  return {
    userId: url.searchParams.get('userId') ?? undefined,
    venueId: url.searchParams.get('venueId') ?? undefined
  };
}

export async function GET(request: Request) {
  try {
    const selection = selectionFromRequest(request);
    await assertLocationPermission(selection, 'view');
    const notes = await getNotesForCurrentShift(selection);
    return NextResponse.json(notes);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to fetch notes' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const selection = selectionFromRequest(request);
    const context = await assertLocationPermission(selection, 'edit');
    const body = await request.json();
    const input = noteInputSchema.parse(body);
    const report = await getCurrentShiftReportRecord(selection);
    const note = await db.note.create({
      data: {
        venueId: context.selectedVenue.id,
        shiftReportId: report.id,
        category: input.category,
        text: input.text,
        author: input.author
      }
    });

    await logActivity({
      context,
      entityType: AuditEntityType.NOTE,
      entityId: note.id,
      action: AuditActionType.CREATED,
      summary: `${context.currentUser.name} created a ${note.category.toLowerCase()} note for ${context.selectedVenue.name}.`,
      afterData: note,
      shiftReportId: report.id,
      noteId: note.id
    });

    return NextResponse.json({
      id: note.id,
      category: note.category,
      text: note.text,
      author: note.author,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString()
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to create note' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const selection = selectionFromRequest(request);
    const context = await assertLocationPermission(selection, 'edit');
    const report = await getCurrentShiftReportRecord(selection);
    const existing = await db.note.findMany({ where: { shiftReportId: report.id } });
    await db.note.deleteMany({ where: { shiftReportId: report.id } });

    await logActivity({
      context,
      entityType: AuditEntityType.NOTE,
      entityId: report.id,
      action: AuditActionType.DELETED,
      summary: `${context.currentUser.name} cleared ${existing.length} notes for ${context.selectedVenue.name}.`,
      beforeData: existing,
      shiftReportId: report.id
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to delete notes' }, { status: 400 });
  }
}
