export type ChecklistState = {
  preShiftCompleted: boolean;
  cashDrawersVerified: boolean;
  barStocked: boolean;
  cleanlinessWalkDone: boolean;
  closingPlanAssigned: boolean;
};

export type VenueRole = 'VIEWER' | 'SUPERVISOR' | 'MANAGER' | 'DIRECTOR';
export type AuditEntityType = 'SHIFT_REPORT' | 'NOTE' | 'TASK';
export type AuditActionType = 'CREATED' | 'UPDATED' | 'COMPLETED' | 'REOPENED' | 'DELETED';

export type AppUserView = {
  id: string;
  name: string;
  email: string;
  isPlatformAdmin: boolean;
};

export type RegionView = {
  id: string;
  name: string;
  code: string;
  venueCount: number;
};

export type VenueView = {
  id: string;
  regionId: string;
  regionName: string;
  name: string;
  code: string;
  location: string;
  timezone: string;
};

export type ShiftReportView = {
  id: string;
  businessDate: string;
  shift: string;
  location: string;
  manager: string;
  openTables: number;
  coversBooked: number;
  laborPercent: number;
  salesToday: number;
  diningStatus: string;
  barStatus: string;
  events: string;
  outages: string[];
  guestIssues: string;
  actions: string;
  ownerDue: string;
  followup: string;
  checklist: ChecklistState;
  isCompleted: boolean;
  completedAt: string | null;
  completedByName: string | null;
  updatedAt: string;
};

export type NoteView = {
  id: string;
  category: string;
  text: string;
  author: string;
  createdAt: string;
  updatedAt: string;
};

export type TaskView = {
  id: string;
  title: string;
  owner: string;
  dueTime: string;
  status: 'OPEN' | 'DONE';
  createdAt: string;
  updatedAt: string;
};

export type ActivityLogView = {
  id: string;
  actorName: string;
  actorEmail: string | null;
  entityType: AuditEntityType;
  action: AuditActionType;
  entityId: string;
  summary: string;
  createdAt: string;
};

export type BootstrapPayload = {
  meta: {
    venueId: string;
    restaurantName: string;
    location: string;
    timezone: string;
    currentUser: AppUserView;
    selectedVenue: VenueView;
    accessibleVenues: VenueView[];
    accessibleRegions: RegionView[];
    availableUsers: AppUserView[];
    role: VenueRole;
    permissions: {
      canView: boolean;
      canEdit: boolean;
      canManageLocations: boolean;
    };
  };
  summary: {
    openTables: number;
    coversBooked: number;
    laborPercent: number;
    salesToday: number;
    issuesOpen: number;
    diningStatus: string;
    barStatus: string;
  };
  dacCurrent: ShiftReportView;
  notes: NoteView[];
  tasks: TaskView[];
  handoff: {
    generatedAt: string;
    openTaskCount: number;
    noteCount: number;
    outages: string[];
    summaryText: string;
  };
  recentActivity: ActivityLogView[];
};

export type SelectionInput = {
  userId?: string | string[];
  venueId?: string | string[];
};

export type ResolvedContext = {
  currentUser: AppUserView;
  role: VenueRole;
  permissions: {
    canView: boolean;
    canEdit: boolean;
    canManageLocations: boolean;
  };
  selectedVenue: VenueView;
  accessibleVenues: VenueView[];
  accessibleRegions: RegionView[];
  availableUsers: AppUserView[];
};

export type RegionAssignmentView = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  regionId: string;
  regionName: string;
  role: VenueRole;
  createdAt: string;
  updatedAt: string;
};

export type VenueAssignmentView = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  venueId: string;
  venueName: string;
  regionName: string;
  role: VenueRole;
  createdAt: string;
  updatedAt: string;
};

export type EffectivePermissionView = {
  userId: string;
  userName: string;
  userEmail: string;
  venueId: string;
  venueName: string;
  regionName: string;
  role: VenueRole;
  source: string;
};

export type AdminPermissionsPayload = {
  meta: {
    actor: AppUserView;
    selectedVenue: VenueView;
    canManageLocations: boolean;
  };
  users: AppUserView[];
  regions: RegionView[];
  venues: VenueView[];
  regionAssignments: RegionAssignmentView[];
  venueAssignments: VenueAssignmentView[];
  effectivePermissions: EffectivePermissionView[];
};
