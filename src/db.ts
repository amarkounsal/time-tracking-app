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
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected';
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

const API_BASE_URL = (import.meta.env.VITE_API_URL as string) || 'https://tapi.keeelai.com/api';

export const EMPTY_DATABASE: DataverseDatabase = {
  employees: [],
  projects: [],
  assignments: [],
  holidays: [],
  timesheets: [],
  lines: [],
  notifications: [],
};

const getHeaders = () => {
  const token = localStorage.getItem('cimple_time_tracker_jwt');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

// Seed or Reset the backend database
export const resetDatabase = async (): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/auth/seed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) {
    throw new Error('Failed to reset/seed database');
  }
  localStorage.removeItem('cimple_time_tracker_jwt');
};

// Get seeded personas list from public endpoint
export const fetchSeededEmployees = async (): Promise<Employee[]> => {
  const res = await fetch(`${API_BASE_URL}/auth/users`);
  if (!res.ok) {
    throw new Error('Failed to fetch user list');
  }
  const users = await res.json();
  return users.map((u: any) => ({
    id: u._id,
    name: u.name,
    role: u.role,
    email: u.email,
    region: u.region
  }));
};

// Login user and store JWT token
export const loginUser = async (email: string): Promise<Employee> => {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'password123' }) // Default password
  });

  if (!res.ok) {
    throw new Error('Login failed');
  }

  const data = await res.json();
  localStorage.setItem('cimple_time_tracker_jwt', data.token);
  
  return {
    id: data.user.id,
    name: data.user.name,
    role: data.user.role,
    email: data.user.email,
    region: data.user.region
  };
};

// Helper mapper for timesheets and lines
const mapTimesheetsAndLines = (mongoTimesheets: any[]): { timesheets: Timesheet[], lines: TimesheetLine[] } => {
  const timesheets: Timesheet[] = [];
  const lines: TimesheetLine[] = [];

  mongoTimesheets.forEach((ts: any) => {
    const empId = typeof ts.employeeId === 'object' && ts.employeeId !== null
      ? ts.employeeId._id
      : ts.employeeId;

    timesheets.push({
      id: ts._id,
      employeeId: empId,
      weekStartDate: ts.weekStartDate,
      status: ts.status,
      submittedAt: ts.submittedAt || null,
      rejectionReason: ts.rejectionReason || null,
      slaExpiresAt: ts.slaExpiresAt || null,
      isEscalated: ts.isEscalated || false,
    });

    if (ts.lines && Array.isArray(ts.lines)) {
      ts.lines.forEach((line: any, idx: number) => {
        const projectId = typeof line.projectId === 'object' && line.projectId !== null ? line.projectId._id : line.projectId;
        lines.push({
          id: line._id || `line_${ts._id}_${projectId}_${idx}`,
          timesheetId: ts._id,
          projectId: projectId,
          hours: line.hours,
          comments: line.comments,
        });
      });
    }
  });

  return { timesheets, lines };
};

// Fetch unified database state from backend
export const getDatabase = async (role?: string): Promise<DataverseDatabase> => {
  const token = localStorage.getItem('cimple_time_tracker_jwt');
  if (!token) {
    return EMPTY_DATABASE;
  }

  try {
    // 1. Fetch dynamic employees
    const employees = await fetchSeededEmployees();

    // 2. Fetch holidays
    const holidaysRes = await fetch(`${API_BASE_URL}/holidays`, { headers: getHeaders() });
    const rawHolidays = holidaysRes.ok ? await holidaysRes.json() : [];
    const holidays: Holiday[] = rawHolidays.map((h: any) => ({
      id: h._id,
      date: h.date,
      name: h.name,
      region: h.region,
      type: h.type
    }));

    // 3. Fetch projects
    const projectsRes = await fetch(`${API_BASE_URL}/projects`, { headers: getHeaders() });
    const rawProjects = projectsRes.ok ? await projectsRes.json() : [];
    const projects: Project[] = rawProjects.map((p: any) => ({
      id: p._id,
      name: p.name,
      client: p.client,
      type: p.type
    }));

    // 4. Fetch assignments
    const assignmentsRes = await fetch(`${API_BASE_URL}/assignments`, { headers: getHeaders() });
    const rawAssignments = assignmentsRes.ok ? await assignmentsRes.json() : [];
    const assignments: ProjectAssignment[] = rawAssignments.map((a: any) => {
      const empId = typeof a.employeeId === 'object' && a.employeeId !== null
        ? a.employeeId._id
        : a.employeeId;
      const projectId = typeof a.projectId === 'object' && a.projectId !== null
        ? a.projectId._id
        : a.projectId;

      return {
        id: a._id,
        employeeId: empId,
        projectId: projectId,
        plannedHours: a.plannedHours
      };
    });

    // 5. Fetch timesheets based on role (Employee sees own, Managers/HR see approvals)
    let rawTimesheets: any[] = [];
    if (role === 'Employee') {
      const tsRes = await fetch(`${API_BASE_URL}/timesheets/my`, { headers: getHeaders() });
      rawTimesheets = tsRes.ok ? await tsRes.json() : [];
    } else if (role) {
      const tsRes = await fetch(`${API_BASE_URL}/timesheets/approvals`, { headers: getHeaders() });
      rawTimesheets = tsRes.ok ? await tsRes.json() : [];
    }

    const { timesheets, lines } = mapTimesheetsAndLines(rawTimesheets);

    // 6. Fetch notifications
    const notifRes = await fetch(`${API_BASE_URL}/notifications`, { headers: getHeaders() });
    const rawNotifs = notifRes.ok ? await notifRes.json() : [];
    const notifications: SystemNotification[] = rawNotifs.map((n: any) => ({
      id: n._id,
      recipientId: n.recipientId,
      title: n.title,
      message: n.message,
      createdAt: n.createdAt,
      isRead: n.isRead
    }));

    return {
      employees,
      projects,
      assignments,
      holidays,
      timesheets,
      lines,
      notifications,
    };
  } catch (error) {
    console.error('Failed to fetch database state', error);
    return EMPTY_DATABASE;
  }
};

// Save timesheet draft
export const saveTimesheet = async (
  _employeeId: string,
  weekStartDate: string,
  gridLines: { projectId: string; hours: number[]; comments: string[] }[]
): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/timesheets/save`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      weekStartDate,
      lines: gridLines.map(gl => ({
        projectId: gl.projectId,
        hours: gl.hours,
        comments: gl.comments
      }))
    })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Failed to save timesheet');
  }
};

// Submit timesheet
export const submitTimesheet = async (timesheetId: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/timesheets/submit`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ timesheetId })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Submission failed');
  }
};

// Recall timesheet
export const recallTimesheet = async (timesheetId: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/timesheets/recall`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ timesheetId })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Recall failed');
  }
};

// Approve timesheet
export const approveTimesheet = async (timesheetId: string, _managerId: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/timesheets/${timesheetId}/approve`, {
    method: 'POST',
    headers: getHeaders()
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Approval failed');
  }
};

// Reject timesheet
export const rejectTimesheet = async (timesheetId: string, _managerId: string, reason: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/timesheets/${timesheetId}/reject`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ reason })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Rejection failed');
  }
};

// Send back timesheet for correction
export const sendBackForCorrection = async (timesheetId: string, _managerId: string, reason: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/timesheets/${timesheetId}/send-back`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ reason })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Correction request failed');
  }
};

// Add holiday
export const addHoliday = async (holiday: Omit<Holiday, 'id'>): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/holidays`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(holiday)
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Failed to add holiday');
  }
};

// Delete holiday
export const deleteHoliday = async (holidayId: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/holidays/${holidayId}`, {
    method: 'DELETE',
    headers: getHeaders()
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Failed to delete holiday');
  }
};

// Add assignment
export const addAssignment = async (assignment: Omit<ProjectAssignment, 'id'>): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/assignments`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      employeeId: assignment.employeeId, // Already the MongoDB ObjectId
      projectId: assignment.projectId,
      plannedHours: assignment.plannedHours
    })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Failed to create assignment');
  }
};

// Delete assignment
export const deleteAssignment = async (assignmentId: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/assignments/${assignmentId}`, {
    method: 'DELETE',
    headers: getHeaders()
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Failed to delete assignment');
  }
};

// Add employee
export const addEmployee = async (employee: Omit<Employee, 'id'> & { password?: string }): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/auth/users`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      name: employee.name,
      email: employee.email,
      role: employee.role,
      region: employee.region,
      password: employee.password || 'password123'
    })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Failed to create employee');
  }
};

// Delete employee
export const deleteEmployee = async (employeeId: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/auth/users/${employeeId}`, {
    method: 'DELETE',
    headers: getHeaders()
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Failed to delete employee');
  }
};

// Add project
export const addProject = async (project: Omit<Project, 'id'>): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/projects`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(project)
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Failed to create project');
  }
};

// Delete project
export const deleteProject = async (projectId: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
    method: 'DELETE',
    headers: getHeaders()
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Failed to delete project');
  }
};

// Mark notifications read
export const markNotificationsRead = async (): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/notifications/mark-read`, {
    method: 'POST',
    headers: getHeaders()
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Failed to mark notifications read');
  }
};

// SLA Check trigger
export const checkAndProcessSlaEscalations = async (): Promise<void> => {
  // Handled on backend
};
