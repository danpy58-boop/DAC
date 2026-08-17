import { AuditActionType, AuditEntityType } from '@prisma/client';
import { NextResponse } from 'next/server';
import { logActivity } from '@/lib/audit';
import { db } from '@/lib/db';
import { assertLocationPermission } from '@/lib/context';
import { getCurrentShiftReportRecord } from '@/lib/queries';

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const selection = {
      userId: url.searchParams.get('userId') ?? undefined,
      venueId: url.searchParams.get('venueId') ?? undefined
    };
    const context = await assertLocationPermission(selection, 'edit');
    const current = await getCurrentShiftReportRecord(selection);
    const updated = await db.shiftReport.update({
      where: { id: current.id },
      data: {
        isCompleted: true,
        completedAt: new Date(),
        completedByUserId: context.currentUser.id,
        completedByName: context.currentUser.name
      }
    });

    await logActivity({
      context,
      entityType: AuditEntityType.SHIFT_REPORT,
      entityId: updated.id,
      action: AuditActionType.COMPLETED,
      summary: `${context.currentUser.name} completed the Daily Action Card for ${context.selectedVenue.name}.`,
      beforeData: { isCompleted: current.isCompleted, completedAt: current.completedAt, completedByName: current.completedByName },
      afterData: { isCompleted: updated.isCompleted, completedAt: updated.completedAt, completedByName: updated.completedByName },
      shiftReportId: updated.id
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to complete Daily Action Card' }, { status: 400 });
  }
}
