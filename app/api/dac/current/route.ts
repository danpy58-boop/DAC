import { AuditActionType, AuditEntityType } from '@prisma/client';
import { NextResponse } from 'next/server';
import { logActivity } from '@/lib/audit';
import { db } from '@/lib/db';
import { assertLocationPermission } from '@/lib/context';
import { getCurrentShiftReportRecord } from '@/lib/queries';
import { shiftReportInputSchema } from '@/lib/validators';

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
    const report = await getCurrentShiftReportRecord(selection);
    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to fetch shift report' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const selection = selectionFromRequest(request);
    const context = await assertLocationPermission(selection, 'edit');
    const body = await request.json();
    const input = shiftReportInputSchema.parse(body);
    const current = await getCurrentShiftReportRecord(selection);

    const report = await db.shiftReport.update({
      where: { id: current.id },
      data: {
        venueId: context.selectedVenue.id,
        businessDate: new Date(`${input.businessDate}T00:00:00.000Z`),
        shift: input.shift,
        location: input.location,
        manager: input.manager,
        openTables: input.openTables,
        coversBooked: input.coversBooked,
        laborPercent: input.laborPercent,
        salesToday: input.salesToday,
        diningStatus: input.diningStatus,
        barStatus: input.barStatus,
        events: input.events,
        outages: input.outages,
        guestIssues: input.guestIssues,
        actions: input.actions,
        ownerDue: input.ownerDue,
        followup: input.followup,
        checklist: input.checklist,
        isCompleted: false,
        completedAt: null,
        completedByUserId: null,
        completedByName: null
      }
    });

    await logActivity({
      context,
      entityType: AuditEntityType.SHIFT_REPORT,
      entityId: report.id,
      action: AuditActionType.UPDATED,
      summary: `${context.currentUser.name} updated the Daily Action Card for ${context.selectedVenue.name}.`,
      beforeData: current,
      afterData: report,
      shiftReportId: report.id
    });

    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to save shift report' }, { status: 400 });
  }
}
