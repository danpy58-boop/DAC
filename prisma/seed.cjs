const { PrismaClient, TaskStatus, VenueRole, AuditActionType, AuditEntityType } = require('@prisma/client');

const prisma = new PrismaClient();

const checklist = {
  preShiftCompleted: true,
  cashDrawersVerified: true,
  barStocked: false,
  cleanlinessWalkDone: true,
  closingPlanAssigned: false
};

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.task.deleteMany();
  await prisma.note.deleteMany();
  await prisma.shiftReport.deleteMany();
  await prisma.venueAccess.deleteMany();
  await prisma.regionAccess.deleteMany();
  await prisma.user.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.region.deleteMany();

  const [riverfrontRegion, rooftopRegion] = await Promise.all([
    prisma.region.create({ data: { name: 'Riverfront Collection', code: 'riverfront-collection' } }),
    prisma.region.create({ data: { name: 'Rooftop Collection', code: 'rooftop-collection' } })
  ]);

  const [northstar, harbor, summit] = await Promise.all([
    prisma.venue.create({ data: { regionId: riverfrontRegion.id, name: 'Northstar Grill & Bar', code: 'northstar', location: 'Riverfront District', timezone: 'America/Chicago' } }),
    prisma.venue.create({ data: { regionId: riverfrontRegion.id, name: 'Harbor House Kitchen + Tap', code: 'harbor-house', location: 'Lakeside Quarter', timezone: 'America/Chicago' } }),
    prisma.venue.create({ data: { regionId: rooftopRegion.id, name: 'Summit Room Rooftop', code: 'summit-room', location: 'Downtown Tower', timezone: 'America/Denver' } })
  ]);

  const [emma, priya, alicia, devon] = await Promise.all([
    prisma.user.create({ data: { name: 'Emma Reed', email: 'emma@ops.example', isPlatformAdmin: true } }),
    prisma.user.create({ data: { name: 'Priya Shah', email: 'priya@regional.example' } }),
    prisma.user.create({ data: { name: 'Alicia Torres', email: 'alicia@northstar.example' } }),
    prisma.user.create({ data: { name: 'Devon Pike', email: 'devon@harbor.example' } })
  ]);

  await prisma.regionAccess.createMany({
    data: [
      { userId: priya.id, regionId: riverfrontRegion.id, role: VenueRole.DIRECTOR },
      { userId: devon.id, regionId: rooftopRegion.id, role: VenueRole.VIEWER }
    ]
  });

  await prisma.venueAccess.createMany({
    data: [
      { userId: emma.id, venueId: northstar.id, role: VenueRole.DIRECTOR },
      { userId: emma.id, venueId: harbor.id, role: VenueRole.DIRECTOR },
      { userId: emma.id, venueId: summit.id, role: VenueRole.DIRECTOR },
      { userId: alicia.id, venueId: northstar.id, role: VenueRole.MANAGER },
      { userId: alicia.id, venueId: harbor.id, role: VenueRole.VIEWER },
      { userId: devon.id, venueId: harbor.id, role: VenueRole.SUPERVISOR },
      { userId: devon.id, venueId: summit.id, role: VenueRole.VIEWER }
    ]
  });

  const northstarReport = await prisma.shiftReport.create({
    data: {
      venueId: northstar.id,
      businessDate: new Date('2026-06-05T00:00:00.000Z'),
      shift: 'Dinner',
      location: 'Main Dining + Bar',
      manager: 'Alicia Torres',
      openTables: 42,
      coversBooked: 118,
      laborPercent: 23.4,
      salesToday: 5480,
      diningStatus: 'On Track',
      barStatus: 'Busy',
      events: 'Patio live music from 7pm, 12-person birthday in lounge, happy hour extension until 6:30pm.',
      outages: ['IPA keg low', 'Mint unavailable'],
      guestIssues: 'Comped dessert for table 22 after delayed entrees; VIP wine service delayed 8 minutes.',
      actions: 'Shift one server to patio at 6:15pm, move second bartender to service well at 7pm, restock sparkling wine before rush.',
      ownerDue: 'Marco by 6:30pm; Nina before close',
      followup: 'Review bar prep levels, inspect patio heater ignition, coach expo on ticket pacing.',
      checklist,
      isCompleted: false
    }
  });

  const harborReport = await prisma.shiftReport.create({
    data: {
      venueId: harbor.id,
      businessDate: new Date('2026-06-05T00:00:00.000Z'),
      shift: 'Lunch',
      location: 'Taproom + Waterfront Patio',
      manager: 'Devon Pike',
      openTables: 29,
      coversBooked: 86,
      laborPercent: 21.1,
      salesToday: 3920,
      diningStatus: 'Busy',
      barStatus: 'On Track',
      events: 'Brewery tasting flight feature and patio waitlist from noon.',
      outages: ['Oyster special sold out'],
      guestIssues: 'Resolved one patio seating delay with appetizer comp.',
      actions: 'Stage an extra food runner at 12:30pm and rotate patio server at 1:00pm.',
      ownerDue: 'Casey by 1:00pm',
      followup: 'Review patio shade setup and reorder pilsner glassware.',
      checklist: { ...checklist, barStocked: true, closingPlanAssigned: true },
      isCompleted: true,
      completedAt: new Date('2026-06-05T19:00:00.000Z'),
      completedByUserId: devon.id,
      completedByName: devon.name
    }
  });

  const summitReport = await prisma.shiftReport.create({
    data: {
      venueId: summit.id,
      businessDate: new Date('2026-06-05T00:00:00.000Z'),
      shift: 'Late Night',
      location: 'Rooftop Lounge',
      manager: 'Night Lead Team',
      openTables: 18,
      coversBooked: 64,
      laborPercent: 19.8,
      salesToday: 4685,
      diningStatus: 'On Track',
      barStatus: 'Recovery Needed',
      events: 'Private cocktail reception at 9pm with rooftop DJ set.',
      outages: ['Espresso martini mix low', 'Patio heaters pending reset'],
      guestIssues: 'Two delayed bottle service deliveries recovered with manager visit.',
      actions: 'Move senior bartender to VIP rail and verify heater resets before sunset.',
      ownerDue: 'Jordan by 8:15pm',
      followup: 'Audit late-night staffing coverage for weekends.',
      checklist: { ...checklist, cashDrawersVerified: false }
    }
  });

  const northstarNotes = await Promise.all([
    prisma.note.create({ data: { venueId: northstar.id, shiftReportId: northstarReport.id, category: 'Operations', text: 'Lunch-to-dinner transition completed 10 minutes early; host stand updated with lounge waitlist process.', author: 'Alicia Torres', createdAt: new Date('2026-06-05T15:15:00.000Z') } }),
    prisma.note.create({ data: { venueId: northstar.id, shiftReportId: northstarReport.id, category: 'Bar', text: 'Service well backed up from 5:40 to 5:55. Added support from floor bartender.', author: 'Alicia Torres', createdAt: new Date('2026-06-05T17:55:00.000Z') } })
  ]);

  const harborNotes = await Promise.all([
    prisma.note.create({ data: { venueId: harbor.id, shiftReportId: harborReport.id, category: 'Guest', text: 'Recovered patio guest after seating delay; comped crab dip and checkback complete.', author: 'Devon Pike', createdAt: new Date('2026-06-05T12:20:00.000Z') } }),
    prisma.note.create({ data: { venueId: harbor.id, shiftReportId: harborReport.id, category: 'Operations', text: 'Waitlist hit 32 minutes at 12:45, patio table turns improved after server swap.', author: 'Devon Pike', createdAt: new Date('2026-06-05T12:48:00.000Z') } })
  ]);

  const summitNotes = await Promise.all([
    prisma.note.create({ data: { venueId: summit.id, shiftReportId: summitReport.id, category: 'Bar', text: 'Pre-batched martini mix running low ahead of rooftop event; backup batch started.', author: 'Emma Reed', createdAt: new Date('2026-06-05T19:05:00.000Z') } })
  ]);

  const northstarTasks = await Promise.all([
    prisma.task.create({ data: { venueId: northstar.id, shiftReportId: northstarReport.id, title: 'Restock sparkling wine', owner: 'Nina', dueTime: '6:30 PM', status: TaskStatus.OPEN, createdAt: new Date('2026-06-05T17:00:00.000Z') } }),
    prisma.task.create({ data: { venueId: northstar.id, shiftReportId: northstarReport.id, title: 'Move support bartender to service well', owner: 'Marco', dueTime: '7:00 PM', status: TaskStatus.DONE, createdAt: new Date('2026-06-05T17:10:00.000Z') } })
  ]);

  const harborTasks = await Promise.all([
    prisma.task.create({ data: { venueId: harbor.id, shiftReportId: harborReport.id, title: 'Re-stage patio bussing station', owner: 'Casey', dueTime: '12:50 PM', status: TaskStatus.OPEN, createdAt: new Date('2026-06-05T12:05:00.000Z') } })
  ]);

  const summitTasks = await Promise.all([
    prisma.task.create({ data: { venueId: summit.id, shiftReportId: summitReport.id, title: 'Reset patio heaters', owner: 'Jordan', dueTime: '8:15 PM', status: TaskStatus.OPEN, createdAt: new Date('2026-06-05T18:45:00.000Z') } })
  ]);

  await prisma.auditLog.createMany({
    data: [
      {
        venueId: northstar.id,
        actorUserId: alicia.id,
        actorName: alicia.name,
        actorEmail: alicia.email,
        entityType: AuditEntityType.SHIFT_REPORT,
        entityId: northstarReport.id,
        action: AuditActionType.CREATED,
        summary: 'Alicia Torres created the Daily Action Card for Northstar Grill & Bar.',
        shiftReportId: northstarReport.id,
        createdAt: new Date('2026-06-05T15:00:00.000Z')
      },
      {
        venueId: harbor.id,
        actorUserId: devon.id,
        actorName: devon.name,
        actorEmail: devon.email,
        entityType: AuditEntityType.SHIFT_REPORT,
        entityId: harborReport.id,
        action: AuditActionType.CREATED,
        summary: 'Devon Pike created the Daily Action Card for Harbor House Kitchen + Tap.',
        shiftReportId: harborReport.id,
        createdAt: new Date('2026-06-05T11:30:00.000Z')
      },
      {
        venueId: harbor.id,
        actorUserId: devon.id,
        actorName: devon.name,
        actorEmail: devon.email,
        entityType: AuditEntityType.SHIFT_REPORT,
        entityId: harborReport.id,
        action: AuditActionType.COMPLETED,
        summary: 'Devon Pike completed the Daily Action Card for Harbor House Kitchen + Tap.',
        shiftReportId: harborReport.id,
        createdAt: new Date('2026-06-05T19:00:00.000Z')
      },
      {
        venueId: summit.id,
        actorUserId: emma.id,
        actorName: emma.name,
        actorEmail: emma.email,
        entityType: AuditEntityType.SHIFT_REPORT,
        entityId: summitReport.id,
        action: AuditActionType.CREATED,
        summary: 'Emma Reed created the Daily Action Card for Summit Room Rooftop.',
        shiftReportId: summitReport.id,
        createdAt: new Date('2026-06-05T18:30:00.000Z')
      },
      ...northstarNotes.map((note, index) => ({
        venueId: northstar.id,
        actorUserId: alicia.id,
        actorName: alicia.name,
        actorEmail: alicia.email,
        entityType: AuditEntityType.NOTE,
        entityId: note.id,
        action: AuditActionType.CREATED,
        summary: `Alicia Torres created note ${index + 1} for Northstar Grill & Bar.`,
        shiftReportId: northstarReport.id,
        noteId: note.id,
        createdAt: new Date(`2026-06-05T1${5 + index}:20:00.000Z`)
      })),
      ...harborNotes.map((note, index) => ({
        venueId: harbor.id,
        actorUserId: devon.id,
        actorName: devon.name,
        actorEmail: devon.email,
        entityType: AuditEntityType.NOTE,
        entityId: note.id,
        action: AuditActionType.CREATED,
        summary: `Devon Pike created note ${index + 1} for Harbor House Kitchen + Tap.`,
        shiftReportId: harborReport.id,
        noteId: note.id,
        createdAt: new Date(`2026-06-05T12:${20 + index * 10}:00.000Z`)
      })),
      {
        venueId: summit.id,
        actorUserId: emma.id,
        actorName: emma.name,
        actorEmail: emma.email,
        entityType: AuditEntityType.NOTE,
        entityId: summitNotes[0].id,
        action: AuditActionType.CREATED,
        summary: 'Emma Reed created a bar note for Summit Room Rooftop.',
        shiftReportId: summitReport.id,
        noteId: summitNotes[0].id,
        createdAt: new Date('2026-06-05T19:05:00.000Z')
      },
      ...northstarTasks.map((task, index) => ({
        venueId: northstar.id,
        actorUserId: alicia.id,
        actorName: alicia.name,
        actorEmail: alicia.email,
        entityType: AuditEntityType.TASK,
        entityId: task.id,
        action: AuditActionType.CREATED,
        summary: `Alicia Torres created task \"${task.title}\" for Northstar Grill & Bar.`,
        shiftReportId: northstarReport.id,
        taskId: task.id,
        createdAt: new Date(`2026-06-05T17:0${index}:00.000Z`)
      })),
      {
        venueId: northstar.id,
        actorUserId: alicia.id,
        actorName: alicia.name,
        actorEmail: alicia.email,
        entityType: AuditEntityType.TASK,
        entityId: northstarTasks[1].id,
        action: AuditActionType.COMPLETED,
        summary: 'Alicia Torres completed task \"Move support bartender to service well\" for Northstar Grill & Bar.',
        shiftReportId: northstarReport.id,
        taskId: northstarTasks[1].id,
        createdAt: new Date('2026-06-05T18:00:00.000Z')
      },
      {
        venueId: harbor.id,
        actorUserId: devon.id,
        actorName: devon.name,
        actorEmail: devon.email,
        entityType: AuditEntityType.TASK,
        entityId: harborTasks[0].id,
        action: AuditActionType.CREATED,
        summary: 'Devon Pike created task \"Re-stage patio bussing station\" for Harbor House Kitchen + Tap.',
        shiftReportId: harborReport.id,
        taskId: harborTasks[0].id,
        createdAt: new Date('2026-06-05T12:05:00.000Z')
      },
      {
        venueId: summit.id,
        actorUserId: emma.id,
        actorName: emma.name,
        actorEmail: emma.email,
        entityType: AuditEntityType.TASK,
        entityId: summitTasks[0].id,
        action: AuditActionType.CREATED,
        summary: 'Emma Reed created task \"Reset patio heaters\" for Summit Room Rooftop.',
        shiftReportId: summitReport.id,
        taskId: summitTasks[0].id,
        createdAt: new Date('2026-06-05T18:45:00.000Z')
      }
    ]
  });

  console.log('Seed complete for final deployment demo with regions and admin permissions');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
