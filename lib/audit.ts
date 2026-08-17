import { AuditActionType, AuditEntityType } from '@prisma/client';
import { db } from '@/lib/db';
import type { ResolvedContext } from '@/lib/types';

type LogActivityInput = {
  context: ResolvedContext;
  entityType: AuditEntityType;
  entityId: string;
  action: AuditActionType;
  summary: string;
  beforeData?: unknown;
  afterData?: unknown;
  shiftReportId?: string;
  noteId?: string;
  taskId?: string;
};

export async function logActivity(input: LogActivityInput) {
  const { context, entityType, entityId, action, summary, beforeData, afterData, shiftReportId, noteId, taskId } = input;

  await db.auditLog.create({
    data: {
      venueId: context.selectedVenue.id,
      actorUserId: context.currentUser.id,
      actorName: context.currentUser.name,
      actorEmail: context.currentUser.email,
      entityType,
      entityId,
      action,
      summary,
      beforeData: beforeData === undefined ? undefined : (beforeData as object),
      afterData: afterData === undefined ? undefined : (afterData as object),
      shiftReportId,
      noteId,
      taskId
    }
  });
}
