import { db } from '@/lib/db';
import { resolveSelectionContext } from '@/lib/context';
import { buildHandoffSummary } from '@/lib/handoff';
import type { ActivityLogView, BootstrapPayload, ChecklistState, NoteView, SelectionInput, ShiftReportView, TaskView } from '@/lib/types';

function serializeChecklist(value: unknown): ChecklistState {
  const checklist = (value ?? {}) as Partial<ChecklistState>;
  return {
    preShiftCompleted: Boolean(checklist.preShiftCompleted),
    cashDrawersVerified: Boolean(checklist.cashDrawersVerified),
    barStocked: Boolean(checklist.barStocked),
    cleanlinessWalkDone: Boolean(checklist.cleanlinessWalkDone),
    closingPlanAssigned: Boolean(checklist.closingPlanAssigned)
  };
}

function serializeReport(report: any): ShiftReportView {
  return {
    id: report.id,
    businessDate: report.businessDate.toISOString().slice(0, 10),
    shift: report.shift,
    location: report.location,
    manager: report.manager,
    openTables: report.openTables,
    coversBooked: report.coversBooked,
    laborPercent: report.laborPercent,
    salesToday: report.salesToday,
    diningStatus: report.diningStatus,
    barStatus: report.barStatus,
    events: report.events,
    outages: report.outages,
    guestIssues: report.guestIssues,
    actions: report.actions,
    ownerDue: report.ownerDue,
    followup: report.followup,
    checklist: serializeChecklist(report.checklist),
    isCompleted: report.isCompleted,
    completedAt: report.completedAt ? report.completedAt.toISOString() : null,
    completedByName: report.completedByName ?? null,
    updatedAt: report.updatedAt.toISOString()
  };
}

function serializeNote(note: any): NoteView {
  return {
    id: note.id,
    category: note.category,
    text: note.text,
    author: note.author,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString()
  };
}

function serializeTask(task: any): TaskView {
  return {
    id: task.id,
    title: task.title,
    owner: task.owner,
    dueTime: task.dueTime,
    status: task.status,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString()
  };
}

function serializeActivity(log: any): ActivityLogView {
  return {
    id: log.id,
    actorName: log.actorName,
    actorEmail: log.actorEmail ?? null,
    entityType: log.entityType,
    action: log.action,
    entityId: log.entityId,
    summary: log.summary,
    createdAt: log.createdAt.toISOString()
  };
}

export async function getCurrentShiftReportRecord(selection: SelectionInput = {}) {
  const context = await resolveSelectionContext(selection);
  const report = await db.shiftReport.findFirst({
    where: { venueId: context.selectedVenue.id },
    orderBy: [{ businessDate: 'desc' }, { updatedAt: 'desc' }]
  });

  if (!report) {
    throw new Error(`No shift report found for ${context.selectedVenue.name}. Seed the database first.`);
  }

  return report;
}

export async function getNotesForCurrentShift(selection: SelectionInput = {}) {
  const report = await getCurrentShiftReportRecord(selection);
  const notes = await db.note.findMany({
    where: { shiftReportId: report.id },
    orderBy: { createdAt: 'desc' }
  });
  return notes.map(serializeNote);
}

export async function getTasksForCurrentShift(selection: SelectionInput = {}) {
  const report = await getCurrentShiftReportRecord(selection);
  const tasks = await db.task.findMany({
    where: { shiftReportId: report.id },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }]
  });
  return tasks.map(serializeTask);
}

export async function getActivityForVenue(selection: SelectionInput = {}, limit = 40) {
  const context = await resolveSelectionContext(selection);
  const logs = await db.auditLog.findMany({
    where: { venueId: context.selectedVenue.id },
    orderBy: { createdAt: 'desc' },
    take: limit
  });
  return logs.map(serializeActivity);
}

export async function getBootstrapPayload(selection: SelectionInput = {}): Promise<BootstrapPayload> {
  const context = await resolveSelectionContext(selection);
  const reportRecord = await getCurrentShiftReportRecord(selection);
  const [notes, tasks, recentActivity] = await Promise.all([
    db.note.findMany({ where: { shiftReportId: reportRecord.id }, orderBy: { createdAt: 'desc' } }),
    db.task.findMany({ where: { shiftReportId: reportRecord.id }, orderBy: [{ status: 'asc' }, { createdAt: 'desc' }] }),
    db.auditLog.findMany({ where: { venueId: context.selectedVenue.id }, orderBy: { createdAt: 'desc' }, take: 8 })
  ]);

  const report = serializeReport(reportRecord);
  const noteViews = notes.map(serializeNote);
  const taskViews = tasks.map(serializeTask);
  const issuesOpen = noteViews.length + report.outages.length + taskViews.filter((task) => task.status === 'OPEN').length;

  return {
    meta: {
      venueId: context.selectedVenue.id,
      restaurantName: context.selectedVenue.name,
      location: context.selectedVenue.location,
      timezone: context.selectedVenue.timezone,
      currentUser: context.currentUser,
      selectedVenue: context.selectedVenue,
      accessibleVenues: context.accessibleVenues,
      accessibleRegions: context.accessibleRegions,
      availableUsers: context.availableUsers,
      role: context.role,
      permissions: context.permissions
    },
    summary: {
      openTables: report.openTables,
      coversBooked: report.coversBooked,
      laborPercent: report.laborPercent,
      salesToday: report.salesToday,
      issuesOpen,
      diningStatus: report.diningStatus,
      barStatus: report.barStatus
    },
    dacCurrent: report,
    notes: noteViews,
    tasks: taskViews,
    handoff: buildHandoffSummary({
      venueName: context.selectedVenue.name,
      location: context.selectedVenue.location,
      report,
      notes: noteViews,
      tasks: taskViews
    }),
    recentActivity: recentActivity.map(serializeActivity)
  };
}
