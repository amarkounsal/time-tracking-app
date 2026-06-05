import { useState, useEffect } from 'react';
import { 
  getDatabase, 
  resetDatabase, 
  saveTimesheet, 
  submitTimesheet, 
  recallTimesheet, 
  approveTimesheet, 
  rejectTimesheet, 
  sendBackForCorrection, 
  addHoliday, 
  deleteHoliday, 
  addAssignment, 
  deleteAssignment, 
  addEmployee,
  deleteEmployee,
  addProject,
  deleteProject,
  loginUser,
  fetchSeededEmployees,
  markNotificationsRead,
  EMPTY_DATABASE
} from './db';
import type { DataverseDatabase, Employee, Project } from './db';
import { Controller } from './components/Controller';
import { EmployeePortal } from './components/EmployeePortal';
import { BackOfficePM } from './components/BackOfficePM';
import { BackOfficeHR } from './components/BackOfficeHR';
import { DashboardFinance } from './components/DashboardFinance';
import { ThreeBg } from './components/ThreeBg';

function App() {
  const [db, setDb] = useState<DataverseDatabase>(EMPTY_DATABASE);
  const [activePersonaId, setActivePersonaId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Trigger state refresh from API
  const refreshDbState = async (role: string) => {
    const freshDb = await getDatabase(role);
    setDb(freshDb);
  };

  // Run initialization on mount
  useEffect(() => {
    const initApp = async () => {
      try {
        setIsLoading(true);
        
        let employees: Employee[] = [];
        try {
          employees = await fetchSeededEmployees();
          if (employees.length === 0) {
            throw new Error('Database empty');
          }
        } catch (fetchErr) {
          console.log("Database might be empty, seeding automatically...");
          await resetDatabase();
          employees = await fetchSeededEmployees();
        }

        // Find default persona (Elena Vance) or fallback to first employee
        const elena = employees.find(e => e.email.toLowerCase() === 'elena.vance@cimplesoft.local');
        const defaultEmp = elena || employees[0];
        
        // Check if there is a saved persona session
        const storedPersonaId = localStorage.getItem('cimple_time_tracker_persona');
        const sessionEmp = employees.find(e => e.id === storedPersonaId);
        
        const activeEmp = sessionEmp || defaultEmp;
        
        // Log in to acquire JWT token
        const userProfile = await loginUser(activeEmp.email);
        setActivePersonaId(userProfile.id);
        localStorage.setItem('cimple_time_tracker_persona', userProfile.id);

        const initialDb = await getDatabase(userProfile.role);
        setDb(initialDb);
      } catch (err) {
        console.error("Failed to initialize app:", err);
      } finally {
        setIsLoading(false);
      }
    };

    initApp();
  }, []);

  // Run periodic background task to refresh timesheet approvals, status changes, and notifications
  useEffect(() => {
    const runBackgroundUpdate = async () => {
      if (!activePersonaId || db.employees.length === 0) return;
      
      const activeEmp = db.employees.find(e => e.id === activePersonaId);
      if (activeEmp) {
        const freshDb = await getDatabase(activeEmp.role);
        setDb(freshDb);
      }
    };

    const interval = setInterval(runBackgroundUpdate, 6000);
    return () => clearInterval(interval);
  }, [activePersonaId, db.employees]);

  const activePersona = db.employees.find(e => e.id === activePersonaId) || db.employees[0];

  const handlePersonaChange = async (id: string) => {
    const selectedEmp = db.employees.find(e => e.id === id);
    if (!selectedEmp) return;

    try {
      setIsLoading(true);
      const userProfile = await loginUser(selectedEmp.email);
      setActivePersonaId(userProfile.id);
      localStorage.setItem('cimple_time_tracker_persona', userProfile.id);
      
      const freshDb = await getDatabase(userProfile.role);
      setDb(freshDb);
    } catch (err: any) {
      alert(err.message || "Failed to switch persona");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetDb = async () => {
    try {
      setIsLoading(true);
      await resetDatabase();
      const employees = await fetchSeededEmployees();
      
      const elena = employees.find(e => e.email.toLowerCase() === 'elena.vance@cimplesoft.local') || employees[0];
      
      const userProfile = await loginUser(elena.email);
      setActivePersonaId(userProfile.id);
      localStorage.setItem('cimple_time_tracker_persona', userProfile.id);
      
      const freshDb = await getDatabase(userProfile.role);
      setDb(freshDb);
    } catch (err: any) {
      alert(err.message || "Failed to reset database");
    } finally {
      setIsLoading(false);
    }
  };

  // Notification read handler
  const handleMarkNotificationsRead = async () => {
    try {
      await markNotificationsRead();
      if (activePersona) {
        await refreshDbState(activePersona.role);
      }
    } catch (err) {
      console.error("Failed to mark notifications read:", err);
    }
  };

  const unreadNotificationsCount = db.notifications.filter(
    n => n.recipientId === activePersonaId && !n.isRead
  ).length;

  // --- MUTATION WRAPPERS ---
  const handleSaveTimesheet = async (weekStartDate: string, lines: { projectId: string; hours: number[]; comments: string[] }[]) => {
    if (!activePersona) return;
    try {
      setIsLoading(true);
      await saveTimesheet(activePersonaId, weekStartDate, lines);
      await refreshDbState(activePersona.role);
    } catch (err: any) {
      alert(err.message || 'Failed to save timesheet');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitTimesheet = async (timesheetId: string) => {
    if (!activePersona) return;
    try {
      setIsLoading(true);
      await submitTimesheet(timesheetId);
      await refreshDbState(activePersona.role);
    } catch (err: any) {
      alert(err.message || 'Failed to submit timesheet');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecallTimesheet = async (timesheetId: string) => {
    if (!activePersona) return;
    try {
      setIsLoading(true);
      await recallTimesheet(timesheetId);
      await refreshDbState(activePersona.role);
    } catch (err: any) {
      alert(err.message || 'Failed to recall timesheet');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveTimesheet = async (timesheetId: string) => {
    if (!activePersona) return;
    try {
      setIsLoading(true);
      await approveTimesheet(timesheetId, activePersonaId);
      await refreshDbState(activePersona.role);
    } catch (err: any) {
      alert(err.message || 'Failed to approve timesheet');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectTimesheet = async (timesheetId: string, reason: string) => {
    if (!activePersona) return;
    try {
      setIsLoading(true);
      await rejectTimesheet(timesheetId, activePersonaId, reason);
      await refreshDbState(activePersona.role);
    } catch (err: any) {
      alert(err.message || 'Failed to reject timesheet');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendBackTimesheet = async (timesheetId: string, reason: string) => {
    if (!activePersona) return;
    try {
      setIsLoading(true);
      await sendBackForCorrection(timesheetId, activePersonaId, reason);
      await refreshDbState(activePersona.role);
    } catch (err: any) {
      alert(err.message || 'Failed to return timesheet for correction');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddHoliday = async (holiday: Omit<Parameters<typeof addHoliday>[0], 'id'>) => {
    if (!activePersona) return;
    try {
      setIsLoading(true);
      await addHoliday(holiday);
      await refreshDbState(activePersona.role);
    } catch (err: any) {
      alert(err.message || 'Failed to add holiday');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteHoliday = async (holidayId: string) => {
    if (!activePersona) return;
    try {
      setIsLoading(true);
      await deleteHoliday(holidayId);
      await refreshDbState(activePersona.role);
    } catch (err: any) {
      alert(err.message || 'Failed to delete holiday');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAssignment = async (assignment: Omit<Parameters<typeof addAssignment>[0], 'id'>) => {
    if (!activePersona) return;
    try {
      setIsLoading(true);
      await addAssignment(assignment);
      await refreshDbState(activePersona.role);
    } catch (err: any) {
      alert(err.message || 'Failed to add project assignment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!activePersona) return;
    try {
      setIsLoading(true);
      await deleteAssignment(assignmentId);
      await refreshDbState(activePersona.role);
    } catch (err: any) {
      alert(err.message || 'Failed to delete project assignment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEmployee = async (employee: Omit<Employee, 'id'> & { password?: string }) => {
    if (!activePersona) return;
    try {
      setIsLoading(true);
      await addEmployee(employee);
      await refreshDbState(activePersona.role);
    } catch (err: any) {
      alert(err.message || 'Failed to add employee');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (!activePersona) return;
    try {
      setIsLoading(true);
      await deleteEmployee(employeeId);
      await refreshDbState(activePersona.role);
    } catch (err: any) {
      alert(err.message || 'Failed to delete employee');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddProject = async (project: Omit<Project, 'id'>) => {
    if (!activePersona) return;
    try {
      setIsLoading(true);
      await addProject(project);
      await refreshDbState(activePersona.role);
    } catch (err: any) {
      alert(err.message || 'Failed to add project');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!activePersona) return;
    try {
      setIsLoading(true);
      await deleteProject(projectId);
      await refreshDbState(activePersona.role);
    } catch (err: any) {
      alert(err.message || 'Failed to delete project');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      <ThreeBg />
      {/* Loading Overlay */}
      {isLoading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 17, 23, 0.7)',
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          color: '#ffffff',
          fontFamily: "'Outfit', sans-serif",
          fontSize: '1.5rem',
          fontWeight: '500',
          transition: 'all 0.3s ease-in-out'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.2rem'
          }}>
            <div style={{
              width: '50px',
              height: '50px',
              border: '4px solid rgba(255, 255, 255, 0.1)',
              borderTop: '4px solid #3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <span>Syncing with MongoDB Database...</span>
          </div>
        </div>
      )}

      {/* Inject custom spin animation styles */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      {/* Top Controller Header */}
      {activePersona && (
        <Controller
          activePersona={activePersona}
          employees={db.employees}
          onPersonaChange={handlePersonaChange}
          db={db}
          onResetDb={handleResetDb}
          onRefreshDb={() => refreshDbState(activePersona.role)}
          notificationCount={unreadNotificationsCount}
          onMarkNotificationsRead={handleMarkNotificationsRead}
        />
      )}

      {/* Main Routed Views based on Role */}
      <main className="app-main">
        {activePersona && activePersona.role === 'Employee' && (
          <EmployeePortal
            employee={activePersona}
            db={db}
            onSaveTimesheet={handleSaveTimesheet}
            onSubmitTimesheet={handleSubmitTimesheet}
            onRecallTimesheet={handleRecallTimesheet}
          />
        )}

        {activePersona && activePersona.role === 'Manager' && (
          <BackOfficePM
            manager={activePersona}
            db={db}
            onApproveTimesheet={handleApproveTimesheet}
            onRejectTimesheet={handleRejectTimesheet}
            onSendBackTimesheet={handleSendBackTimesheet}
            onTriggerEscalationCheck={() => refreshDbState(activePersona.role)}
          />
        )}

        {activePersona && activePersona.role === 'HR' && (
          <BackOfficeHR
            hrAdmin={activePersona}
            db={db}
            onAddHoliday={handleAddHoliday}
            onDeleteHoliday={handleDeleteHoliday}
            onAddAssignment={handleAddAssignment}
            onDeleteAssignment={handleDeleteAssignment}
            onAddEmployee={handleAddEmployee}
            onDeleteEmployee={handleDeleteEmployee}
            onAddProject={handleAddProject}
            onDeleteProject={handleDeleteProject}
          />
        )}

        {activePersona && activePersona.role === 'Finance' && (
          <DashboardFinance
            financeUser={activePersona}
            db={db}
          />
        )}
      </main>
    </div>
  );
}

export default App;
