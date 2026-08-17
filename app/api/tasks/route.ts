import { AuditActionType, AuditEntityType } from '@prisma/client';
import { NextResponse } from 'next/server';
import { logActivity } from '@/lib/audit';
import { db } from '@/lib/db';
import { assertLocationPermission } from '@/lib/context';
import { getCurrentShiftReportRecord, getTasksForCurrentShift } from '@/lib/queries';
import { taskInputSchema } from '@/lib/validators';

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
    const tasks = await getTasksForCurrentShift(selection);
    return NextResponse.json(tasks);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to fetch tasks' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const selection = selectionFromRequest(request);
    const context = await assertLocationPermission(selection, 'edit');
    const body = await request.json();
    const input = taskInputSchema.parse(body);
    const report = await getCurrentShiftReportRecord(selection);
    const task = await db.task.create({
      data: {
        venueId: context.selectedVenue.id,
        shiftReportId: report.id,
        title: input.title,
        owner: input.owner,
        dueTime: input.dueTime
      }
    });

    await logActivity({
      context,
      entityType: AuditEntityType.TASK,
      entityId: task.id,
      action: AuditActionType.CREATED,
      summary: `${context.currentUser.name} created task \"${task.title}\" for ${context.selectedVenue.name}.`,
      afterData: task,
      shiftReportId: report.id,
      taskId: task.id
    });

    return NextResponse.json({
      id: task.id,
      title: task.title,
      owner: task.owner,
      dueTime: task.dueTime,
      status: task.status,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString()
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to create task' }, { status: 400 });
  }
}
