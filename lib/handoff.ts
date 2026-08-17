import { TaskStatus } from '@prisma/client';
import type { NoteView, ShiftReportView, TaskView } from '@/lib/types';

export function buildHandoffSummary(params: {
  venueName: string;
  location: string;
  report: ShiftReportView;
  notes: NoteView[];
  tasks: TaskView[];
}) {
  const { venueName, location, report, notes, tasks } = params;
  const openTasks = tasks.filter((task) => task.status === TaskStatus.OPEN);
  const doneTasks = tasks.filter((task) => task.status === TaskStatus.DONE);
  const checkedItems = Object.entries(report.checklist)
    .filter(([, value]) => Boolean(value))
    .map(([key]) => key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()));

  return {
    generatedAt: new Date().toISOString(),
    openTaskCount: openTasks.length,
    noteCount: notes.length,
    outages: report.outages,
    summaryText: [
      `Shift handoff for ${report.businessDate} — ${report.shift}`,
      `Venue: ${venueName} • ${location}`,
      `Manager on duty: ${report.manager}`,
      `Daily action card status: ${report.isCompleted ? `Completed by ${report.completedByName || 'Unknown'} at ${report.completedAt || 'unknown time'}` : 'In progress'}`,
      `Dining room status: ${report.diningStatus}`,
      `Bar status: ${report.barStatus}`,
      `Open tables: ${report.openTables}`,
      `Covers booked: ${report.coversBooked}`,
      `Labor %: ${report.laborPercent}`,
      `Sales today: $${report.salesToday}`,
      `Events: ${report.events || 'No special events logged'}`,
      `86 list / outages: ${report.outages.length ? report.outages.join(', ') : 'None logged'}`,
      `Guest issues / recovery: ${report.guestIssues || 'No guest issues logged'}`,
      `Checklist complete: ${checkedItems.length ? checkedItems.join(', ') : 'No checklist items checked yet'}`,
      `Immediate actions: ${report.actions || 'No immediate actions recorded'}`,
      `Owner + due time: ${report.ownerDue || 'No owner or due time assigned'}`,
      `Tomorrow follow-up: ${report.followup || 'No next-day follow-up recorded'}`,
      `Open tasks: ${openTasks.length ? openTasks.map((task) => `${task.title} (${task.owner}, ${task.dueTime})`).join('; ') : 'None'}`,
      `Completed tasks: ${doneTasks.length ? doneTasks.map((task) => task.title).join('; ') : 'None'}`,
      `Latest notes: ${notes.length ? notes.slice(0, 5).map((note) => `[${new Date(note.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}] ${note.category}: ${note.text}`).join(' | ') : 'No notes logged'}`
    ].join('\n')
  };
}
