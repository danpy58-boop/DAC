import { AuditActionType, AuditEntityType, TaskStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { logActivity } from '@/lib/audit';
import { db } from '@/lib/db';
import { assertLocationPermission } from '@/lib/context';
import { taskPatchSchema } from '@/lib/validators';

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
    const existing = await db.task.findFirst({ where: { id: params.id, venueId: context.selectedVenue.id } });
    if (!existing) {
      return NextResponse.json({ error: 'Task not found for selected venue' }, { status: 404 });
    }

    const body = await request.json();
    const input = taskPatchSchema.parse(body);
    const updated = await db.task.update({
      where: { id: existing.id },
      data: input
    });

    const action = existing.status !== TaskStatus.DONE && updated.status === TaskStatus.DONE
      ? AuditActionType.COMPLETED
      : existing.status === TaskStatus.DONE && updated.status === TaskStatus.OPEN
        ? AuditActionType.REOPENED
        : AuditActionType.UPDATED;

    await logActivity({
      context,
      entityType: AuditEntityType.TASK,
      entityId: updated.id,
      action,
      summary: `${context.currentUser.name} ${action === AuditActionType.COMPLETED ? 'completed' : action === AuditActionType.REOPENED ? 'reopened' : 'updated'} task \"${updated.title}\" for ${context.selectedVenue.name}.`,
      beforeData: existing,
      afterData: updated,
      shiftReportId: updated.shiftReportId ?? undefined,
      taskId: updated.id
    });

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      owner: updated.owner,
      dueTime: updated.dueTime,
      status: updated.status,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString()
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to update task' }, { status: 400 });
  }
}
