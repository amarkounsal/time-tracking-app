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
  checkAndProcessSlaEscalations 
} from './db';
import type { DataverseDatabase } from './db';
import { Controller } from './components/Controller';
import { EmployeePortal } from './components/EmployeePortal';
import { BackOfficePM } from './components/BackOfficePM';
import { BackOfficeHR } from './components/BackOfficeHR';
import { DashboardFinance } from './components/DashboardFinance';

function App() {
  const [db, setDb] = useState<DataverseDatabase>(getDatabase());
  const [activePersonaId, setActivePersonaId] = useState<string>('emp_elena');

  // Trigger state refresh from localStorage
  const refreshDbState = () => {
    setDb(getDatabase());
  };

  // Run periodic background task for SLA escalations
  useEffect(() => {
    const runSlaCheck = () => {
      checkAndProcessSlaEscalations();
      refreshDbState();
    };

    // Run once on mount
    runSlaCheck();

    // Check SLA every 5 seconds
    const interval = setInterval(runSlaCheck, 5000);
    return () => clearInterval(interval);
  }, []);

  const activePersona = db.employees.find(e => e.id === activePersonaId) || db.employees[0];

  const handlePersonaChange = (id: string) => {
    setActivePersonaId(id);
  };

  const handleResetDb = () => {
    resetDatabase();
    refreshDbState();
    setActivePersonaId('emp_elena');
  };

  // Notification read handler
  const handleMarkNotificationsRead = () => {
    const updatedDb = getDatabase();
    updatedDb.notifications.forEach(n => {
      if (n.recipientId === activePersonaId) {
        n.isRead = true;
      }
    });
    // save updated state
    localStorage.setItem('cimple_soft_time_tracker_db', JSON.stringify(updatedDb));
    setDb(updatedDb);
  };

  const unreadNotificationsCount = db.notifications.filter(
    n => n.recipientId === activePersonaId && !n.isRead
  ).length;

  // --- MUTATION WRAPPERS ---
  const handleSaveTimesheet = (weekStartDate: string, lines: { projectId: string; hours: number[]; comments: string[] }[]) => {
    saveTimesheet(activePersonaId, weekStartDate, lines);
    refreshDbState();
  };

  const handleSubmitTimesheet = (timesheetId: string) => {
    submitTimesheet(timesheetId);
    refreshDbState();
  };

  const handleRecallTimesheet = (timesheetId: string) => {
    recallTimesheet(timesheetId);
    refreshDbState();
  };

  const handleApproveTimesheet = (timesheetId: string) => {
    approveTimesheet(timesheetId, activePersonaId);
    refreshDbState();
  };

  const handleRejectTimesheet = (timesheetId: string, reason: string) => {
    rejectTimesheet(timesheetId, activePersonaId, reason);
    refreshDbState();
  };

  const handleSendBackTimesheet = (timesheetId: string, reason: string) => {
    sendBackForCorrection(timesheetId, activePersonaId, reason);
    refreshDbState();
  };

  const handleAddHoliday = (holiday: Omit<Parameters<typeof addHoliday>[0], 'id'>) => {
    addHoliday(holiday);
    refreshDbState();
  };

  const handleDeleteHoliday = (holidayId: string) => {
    deleteHoliday(holidayId);
    refreshDbState();
  };

  const handleAddAssignment = (assignment: Omit<Parameters<typeof addAssignment>[0], 'id'>) => {
    addAssignment(assignment);
    refreshDbState();
  };

  const handleDeleteAssignment = (assignmentId: string) => {
    deleteAssignment(assignmentId);
    refreshDbState();
  };

  return (
    <div className="app-container">
      {/* Top Controller Header */}
      <Controller
        activePersona={activePersona}
        employees={db.employees}
        onPersonaChange={handlePersonaChange}
        db={db}
        onResetDb={handleResetDb}
        onRefreshDb={refreshDbState}
        notificationCount={unreadNotificationsCount}
        onMarkNotificationsRead={handleMarkNotificationsRead}
      />

      {/* Main Routed Views based on Role */}
      <main className="app-main">
        {activePersona.role === 'Employee' && (
          <EmployeePortal
            employee={activePersona}
            db={db}
            onSaveTimesheet={handleSaveTimesheet}
            onSubmitTimesheet={handleSubmitTimesheet}
            onRecallTimesheet={handleRecallTimesheet}
          />
        )}

        {activePersona.role === 'Manager' && (
          <BackOfficePM
            manager={activePersona}
            db={db}
            onApproveTimesheet={handleApproveTimesheet}
            onRejectTimesheet={handleRejectTimesheet}
            onSendBackTimesheet={handleSendBackTimesheet}
            onTriggerEscalationCheck={refreshDbState}
          />
        )}

        {activePersona.role === 'HR' && (
          <BackOfficeHR
            hrAdmin={activePersona}
            db={db}
            onAddHoliday={handleAddHoliday}
            onDeleteHoliday={handleDeleteHoliday}
            onAddAssignment={handleAddAssignment}
            onDeleteAssignment={handleDeleteAssignment}
          />
        )}

        {activePersona.role === 'Finance' && (
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
