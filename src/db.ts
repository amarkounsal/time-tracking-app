export interface Employee {
  id: string;
  name: string;
  role: 'Employee' | 'Manager' | 'HR' | 'Finance';
  email: string;
  region: 'US' | 'IN' | 'UK' | 'Global';
}

export interface Project {
  id: string;
  name: string;
  client: string;
  type: 'billable' | 'internal';
}

export interface ProjectAssignment {
  id: string;
  employeeId: string;
  projectId: string;
  plannedHours: number;
}

export interface Holiday {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  region: 'US' | 'IN' | 'UK' | 'Global';
  type: 'public' | 'optional' | 'shutdown';
}

export interface Timesheet {
  id: string;
  employeeId: string;
  weekStartDate: string; // YYYY-MM-DD (always a Monday)
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | 'Recalled';
  submittedAt: string | null;
  rejectionReason: string | null;
  slaExpiresAt: string | null; // Timestamp
  isEscalated: boolean;
}

export interface TimesheetLine {
  id: string;
  timesheetId: string;
  projectId: string;
  hours: number[]; // Array of 7 numbers [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
  comments: string[]; // Array of 7 comments corresponding to the hours
}

export interface SystemNotification {
  id: string;
  recipientId: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}

export interface DataverseDatabase {
  employees: Employee[];
  projects: Project[];
  assignments: ProjectAssignment[];
  holidays: Holiday[];
  timesheets: Timesheet[];
  lines: TimesheetLine[];
  notifications: SystemNotification[];
}

const LOCAL_STORAGE_KEY = 'cimple_soft_time_tracker_db';

export const DEFAULT_EMPLOYEES: Employee[] = [
  { id: 'emp_elena', name: 'Elena Vance', role: 'Employee', email: 'elena.vance@cimplesoft.local', region: 'US' },
  { id: 'emp_john', name: 'John Doe', role: 'Employee', email: 'john.doe@cimplesoft.local', region: 'IN' },
  { id: 'emp_marcus', name: 'Marcus Vance', role: 'Manager', email: 'marcus.vance@cimplesoft.local', region: 'Global' },
  { id: 'emp_sarah', name: 'Sarah Jenkins', role: 'HR', email: 'sarah.jenkins@cimplesoft.local', region: 'Global' },
  { id: 'emp_david', name: 'David Chen', role: 'Finance', email: 'david.chen@cimplesoft.local', region: 'Global' },
];

export const DEFAULT_PROJECTS: Project[] = [
  { id: 'proj_alpha', name: 'Project Alpha', client: 'Acme Corporation', type: 'billable' },
  { id: 'proj_beta', name: 'Project Beta', client: 'Globex Corp', type: 'billable' },
  { id: 'proj_internal', name: 'Internal R&D', client: 'CimpleSoft', type: 'internal' },
];

export const DEFAULT_ASSIGNMENTS: ProjectAssignment[] = [
  { id: 'asg_elena_alpha', employeeId: 'emp_elena', projectId: 'proj_alpha', plannedHours: 30 },
  { id: 'asg_elena_internal', employeeId: 'emp_elena', projectId: 'proj_internal', plannedHours: 10 },
  { id: 'asg_john_beta', employeeId: 'emp_john', projectId: 'proj_beta', plannedHours: 32 },
  { id: 'asg_john_internal', employeeId: 'emp_john', projectId: 'proj_internal', plannedHours: 8 },
];

export const DEFAULT_HOLIDAYS: Holiday[] = [
  { id: 'hol_newyear', date: '2026-01-01', name: "New Year's Day", region: 'Global', type: 'public' },
  { id: 'hol_memorial', date: '2026-05-25', name: 'Memorial Day', region: 'US', type: 'public' },
  { id: 'hol_foundation', date: '2026-06-08', name: 'CimpleSoft Foundation Day', region: 'Global', type: 'shutdown' },
  { id: 'hol_independence', date: '2026-07-04', name: 'Independence Day', region: 'US', type: 'public' },
  { id: 'hol_diwali', date: '2026-11-08', name: 'Diwali Festival', region: 'IN', type: 'public' },
  { id: 'hol_christmas', date: '2026-12-25', name: 'Christmas Day', region: 'Global', type: 'public' },
];

// Seed some initial timesheets
const seedTimesheets = (): { timesheets: Timesheet[]; lines: TimesheetLine[]; notifications: SystemNotification[] } => {
  const timesheets: Timesheet[] = [];
  const lines: TimesheetLine[] = [];
  const notifications: SystemNotification[] = [];

  // 1. Elena's Approved Timesheet for Week of 2026-05-25 (Memorial Day was Monday, May 25)
  // She worked on the Holiday (Memorial Day) and entered a comment.
  const t1Id = 'ts_elena_w1';
  timesheets.push({
    id: t1Id,
    employeeId: 'emp_elena',
    weekStartDate: '2026-05-25',
    status: 'Approved',
    submittedAt: '2026-05-29T17:00:00Z',
    rejectionReason: null,
    slaExpiresAt: null,
    isEscalated: false,
  });

  lines.push({
    id: 'line_elena_w1_alpha',
    timesheetId: t1Id,
    projectId: 'proj_alpha',
    hours: [6, 8, 8, 8, 8, 0, 0], // Worked 6 hrs on Monday (Memorial Day)
    comments: ['Worked 6 hours on Memorial Day for hotfix deployment.', '', '', '', '', '', ''],
  });

  lines.push({
    id: 'line_elena_w1_internal',
    timesheetId: t1Id,
    projectId: 'proj_internal',
    hours: [2, 0, 0, 0, 0, 0, 0], // Worked 2 hrs on internal
    comments: ['Required administrative startup tasks.', '', '', '', '', '', ''],
  });

  // 2. John's Submitted Timesheet for Week of 2026-06-01 (Awaiting Approval)
  // Submitted 2 hours ago (so PM Marcus has a pending item)
  const t2Id = 'ts_john_w2';
  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
  const slaExpires = new Date(now.getTime() + 22 * 60 * 60 * 1000).toISOString(); // 22h left (total 24h)

  timesheets.push({
    id: t2Id,
    employeeId: 'emp_john',
    weekStartDate: '2026-06-01',
    status: 'Submitted',
    submittedAt: twoHoursAgo,
    rejectionReason: null,
    slaExpiresAt: slaExpires,
    isEscalated: false,
  });

  lines.push({
    id: 'line_john_w2_beta',
    timesheetId: t2Id,
    projectId: 'proj_beta',
    hours: [8, 8, 8, 8, 8, 0, 0],
    comments: ['', '', '', '', '', '', ''],
  });

  lines.push({
    id: 'line_john_w2_internal',
    timesheetId: t2Id,
    projectId: 'proj_internal',
    hours: [0, 0, 0, 1, 1, 0, 0],
    comments: ['', '', '', 'Team sync.', 'Weekly reporting.', '', ''],
  });

  // 3. Elena's Draft Timesheet for the Current Week (2026-06-01)
  const t3Id = 'ts_elena_w3';
  timesheets.push({
    id: t3Id,
    employeeId: 'emp_elena',
    weekStartDate: '2026-06-01',
    status: 'Draft',
    submittedAt: null,
    rejectionReason: null,
    slaExpiresAt: null,
    isEscalated: false,
  });

  lines.push({
    id: 'line_elena_w3_alpha',
    timesheetId: t3Id,
    projectId: 'proj_alpha',
    hours: [8, 8, 8, 4, 0, 0, 0], // Partial draft
    comments: ['', '', '', '', '', '', ''],
  });

  // Seed notification history
  notifications.push({
    id: 'notif_1',
    recipientId: 'emp_elena',
    title: 'Timesheet Approved',
    message: 'Your timesheet for the week of May 25, 2026 was approved by Marcus Vance.',
    createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
    isRead: true,
  });

  return { timesheets, lines, notifications };
};

export const getDatabase = (): DataverseDatabase => {
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) {
    const { timesheets, lines, notifications } = seedTimesheets();
    const db: DataverseDatabase = {
      employees: DEFAULT_EMPLOYEES,
      projects: DEFAULT_PROJECTS,
      assignments: DEFAULT_ASSIGNMENTS,
      holidays: DEFAULT_HOLIDAYS,
      timesheets,
      lines,
      notifications,
    };
    saveDatabase(db);
    return db;
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse database, resetting...', e);
    const { timesheets, lines, notifications } = seedTimesheets();
    const db: DataverseDatabase = {
      employees: DEFAULT_EMPLOYEES,
      projects: DEFAULT_PROJECTS,
      assignments: DEFAULT_ASSIGNMENTS,
      holidays: DEFAULT_HOLIDAYS,
      timesheets,
      lines,
      notifications,
    };
    saveDatabase(db);
    return db;
  }
};

export const saveDatabase = (db: DataverseDatabase): void => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(db));
};

export const resetDatabase = (): DataverseDatabase => {
  localStorage.removeItem(LOCAL_STORAGE_KEY);
  return getDatabase();
};

// State Mutations helper library
export const saveTimesheet = (
  employeeId: string,
  weekStartDate: string,
  gridLines: { projectId: string; hours: number[]; comments: string[] }[]
): DataverseDatabase => {
  const db = getDatabase();
  
  // Find or create timesheet header
  let ts = db.timesheets.find(t => t.employeeId === employeeId && t.weekStartDate === weekStartDate);
  if (!ts) {
    ts = {
      id: `ts_${employeeId}_${weekStartDate.replace(/-/g, '')}`,
      employeeId,
      weekStartDate,
      status: 'Draft',
      submittedAt: null,
      rejectionReason: null,
      slaExpiresAt: null,
      isEscalated: false,
    };
    db.timesheets.push(ts);
  } else {
    // If timesheet exists and is not draft or recalled, block saving
    if (ts.status !== 'Draft' && ts.status !== 'Recalled' && ts.status !== 'Rejected') {
      throw new Error("Cannot save. Timesheet is already submitted or approved.");
    }
  }

  // Remove existing lines for this timesheet
  db.lines = db.lines.filter(l => l.timesheetId !== ts!.id);

  // Add new lines
  gridLines.forEach((gl, idx) => {
    db.lines.push({
      id: `line_${ts!.id}_${gl.projectId}_${idx}`,
      timesheetId: ts!.id,
      projectId: gl.projectId,
      hours: [...gl.hours],
      comments: [...gl.comments],
    });
  });

  saveDatabase(db);
  return db;
};

export const submitTimesheet = (timesheetId: string): DataverseDatabase => {
  const db = getDatabase();
  const ts = db.timesheets.find(t => t.id === timesheetId);
  if (!ts) throw new Error("Timesheet not found");

  const now = new Date();
  // SLA Expires in simulated 24 hours.
  // We'll set a standard timestamp (24h later)
  const slaExpires = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  ts.status = 'Submitted';
  ts.submittedAt = now.toISOString();
  ts.slaExpiresAt = slaExpires;
  ts.rejectionReason = null;
  ts.isEscalated = false;

  // Add system notification for Manager Marcus
  db.notifications.push({
    id: `notif_${Date.now()}`,
    recipientId: 'emp_marcus',
    title: 'New Timesheet Submitted',
    message: `${db.employees.find(e => e.id === ts.employeeId)?.name} has submitted a timesheet for the week of ${ts.weekStartDate}.`,
    createdAt: now.toISOString(),
    isRead: false,
  });

  saveDatabase(db);
  return db;
};

export const recallTimesheet = (timesheetId: string): DataverseDatabase => {
  const db = getDatabase();
  const ts = db.timesheets.find(t => t.id === timesheetId);
  if (!ts) throw new Error("Timesheet not found");

  if (ts.status !== 'Submitted') {
    throw new Error("Can only recall submitted timesheets");
  }

  ts.status = 'Draft';
  ts.submittedAt = null;
  ts.slaExpiresAt = null;
  ts.isEscalated = false;

  saveDatabase(db);
  return db;
};

export const approveTimesheet = (timesheetId: string, managerId: string): DataverseDatabase => {
  const db = getDatabase();
  const ts = db.timesheets.find(t => t.id === timesheetId);
  if (!ts) throw new Error("Timesheet not found");

  ts.status = 'Approved';
  ts.slaExpiresAt = null;

  const managerName = db.employees.find(e => e.id === managerId)?.name || 'Manager';

  // Notify Employee
  db.notifications.push({
    id: `notif_${Date.now()}`,
    recipientId: ts.employeeId,
    title: 'Timesheet Approved',
    message: `Your timesheet for the week of ${ts.weekStartDate} has been approved by ${managerName}.`,
    createdAt: new Date().toISOString(),
    isRead: false,
  });

  saveDatabase(db);
  return db;
};

export const rejectTimesheet = (timesheetId: string, managerId: string, reason: string): DataverseDatabase => {
  if (!reason.trim()) throw new Error("Rejection reason is mandatory");

  const db = getDatabase();
  const ts = db.timesheets.find(t => t.id === timesheetId);
  if (!ts) throw new Error("Timesheet not found");

  ts.status = 'Rejected';
  ts.rejectionReason = reason;
  ts.slaExpiresAt = null;

  const managerName = db.employees.find(e => e.id === managerId)?.name || 'Manager';

  // Notify Employee
  db.notifications.push({
    id: `notif_${Date.now()}`,
    recipientId: ts.employeeId,
    title: 'Timesheet Rejected',
    message: `Your timesheet for the week of ${ts.weekStartDate} was rejected by ${managerName}. Reason: ${reason}`,
    createdAt: new Date().toISOString(),
    isRead: false,
  });

  saveDatabase(db);
  return db;
};

export const sendBackForCorrection = (timesheetId: string, managerId: string, reason: string): DataverseDatabase => {
  if (!reason.trim()) throw new Error("Correction reason is mandatory");

  const db = getDatabase();
  const ts = db.timesheets.find(t => t.id === timesheetId);
  if (!ts) throw new Error("Timesheet not found");

  // Send back sets it to Recalled/Draft so the employee can edit it again
  ts.status = 'Draft';
  ts.rejectionReason = `Correction Needed: ${reason}`;
  ts.slaExpiresAt = null;
  ts.submittedAt = null;

  const managerName = db.employees.find(e => e.id === managerId)?.name || 'Manager';

  // Notify Employee
  db.notifications.push({
    id: `notif_${Date.now()}`,
    recipientId: ts.employeeId,
    title: 'Timesheet Correction Required',
    message: `Your timesheet for the week of ${ts.weekStartDate} has been returned for correction by ${managerName}. Reason: ${reason}`,
    createdAt: new Date().toISOString(),
    isRead: false,
  });

  saveDatabase(db);
  return db;
};

export const addHoliday = (holiday: Omit<Holiday, 'id'>): DataverseDatabase => {
  const db = getDatabase();
  const id = `hol_${Date.now()}`;
  db.holidays.push({ ...holiday, id });
  saveDatabase(db);
  return db;
};

export const deleteHoliday = (holidayId: string): DataverseDatabase => {
  const db = getDatabase();
  db.holidays = db.holidays.filter(h => h.id !== holidayId);
  saveDatabase(db);
  return db;
};

export const addAssignment = (assignment: Omit<ProjectAssignment, 'id'>): DataverseDatabase => {
  const db = getDatabase();
  
  // Check duplicate
  const exists = db.assignments.some(
    a => a.employeeId === assignment.employeeId && a.projectId === assignment.projectId
  );
  if (exists) throw new Error("Assignment already exists");

  const id = `asg_${Date.now()}`;
  db.assignments.push({ ...assignment, id });
  saveDatabase(db);
  return db;
};

export const deleteAssignment = (assignmentId: string): DataverseDatabase => {
  const db = getDatabase();
  db.assignments = db.assignments.filter(a => a.id !== assignmentId);
  saveDatabase(db);
  return db;
};

// Check for SLA breach and escalate in real time
export const checkAndProcessSlaEscalations = (): DataverseDatabase => {
  const db = getDatabase();
  const now = new Date();
  let updated = false;

  db.timesheets.forEach(ts => {
    if (ts.status === 'Submitted' && ts.slaExpiresAt && !ts.isEscalated) {
      const expires = new Date(ts.slaExpiresAt);
      if (now > expires) {
        ts.isEscalated = true;
        updated = true;

        // Notify HR admin Sarah
        db.notifications.push({
          id: `notif_${Date.now()}_esc_${ts.id}`,
          recipientId: 'emp_sarah',
          title: 'SLA Escalation Alert',
          message: `Timesheet for ${db.employees.find(e => e.id === ts.employeeId)?.name} (week of ${ts.weekStartDate}) has breached SLA and has been escalated to HR.`,
          createdAt: now.toISOString(),
          isRead: false,
        });
      }
    }
  });

  if (updated) {
    saveDatabase(db);
  }
  return db;
};
