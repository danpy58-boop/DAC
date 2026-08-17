import { z } from 'zod';

export const checklistSchema = z.object({
  preShiftCompleted: z.boolean(),
  cashDrawersVerified: z.boolean(),
  barStocked: z.boolean(),
  cleanlinessWalkDone: z.boolean(),
  closingPlanAssigned: z.boolean()
});

export const shiftReportInputSchema = z.object({
  businessDate: z.string().min(1),
  shift: z.string().min(1),
  location: z.string().min(1),
  manager: z.string().min(1),
  openTables: z.coerce.number().int().min(0),
  coversBooked: z.coerce.number().int().min(0),
  laborPercent: z.coerce.number().min(0),
  salesToday: z.coerce.number().int().min(0),
  diningStatus: z.string().min(1),
  barStatus: z.string().min(1),
  events: z.string().default(''),
  outages: z.array(z.string()).default([]),
  guestIssues: z.string().default(''),
  actions: z.string().default(''),
  ownerDue: z.string().default(''),
  followup: z.string().default(''),
  checklist: checklistSchema
});

export const noteInputSchema = z.object({
  category: z.string().min(1),
  text: z.string().min(1),
  author: z.string().min(1).default('Manager on duty')
});

export const noteUpdateSchema = z.object({
  category: z.string().min(1).optional(),
  text: z.string().min(1).optional(),
  author: z.string().min(1).optional()
}).refine((value) => Object.keys(value).length > 0, 'At least one field must be updated');

export const taskInputSchema = z.object({
  title: z.string().min(1),
  owner: z.string().min(1).default('Unassigned'),
  dueTime: z.string().min(1).default('End of shift')
});

export const taskPatchSchema = z.object({
  title: z.string().min(1).optional(),
  owner: z.string().min(1).optional(),
  dueTime: z.string().min(1).optional(),
  status: z.enum(['OPEN', 'DONE']).optional()
}).refine((value) => Object.keys(value).length > 0, 'At least one field must be updated');

const roleEnum = z.enum(['VIEWER', 'SUPERVISOR', 'MANAGER', 'DIRECTOR']);

export const adminPermissionUpsertSchema = z.object({
  scope: z.enum(['REGION', 'VENUE']),
  targetUserId: z.string().min(1),
  role: roleEnum,
  regionId: z.string().optional(),
  venueId: z.string().optional()
}).superRefine((value, ctx) => {
  if (value.scope === 'REGION' && !value.regionId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'regionId is required for region assignments', path: ['regionId'] });
  }
  if (value.scope === 'VENUE' && !value.venueId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'venueId is required for venue assignments', path: ['venueId'] });
  }
});

export const adminPermissionDeleteSchema = z.object({
  scope: z.enum(['REGION', 'VENUE']),
  accessId: z.string().min(1)
});
