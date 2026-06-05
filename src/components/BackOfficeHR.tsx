import React, { useState } from 'react';
import { 
  Calendar, 
  UserPlus, 
  Trash2, 
  Plus, 
  Globe, 
  FolderGit2,
  Users,
  Briefcase
} from 'lucide-react';
import type { Employee, DataverseDatabase, Holiday, ProjectAssignment, Project } from '../db';

interface BackOfficeHRProps {
  hrAdmin: Employee;
  db: DataverseDatabase;
  onAddHoliday: (holiday: Omit<Holiday, 'id'>) => void;
  onDeleteHoliday: (holidayId: string) => void;
  onAddAssignment: (assignment: Omit<ProjectAssignment, 'id'>) => void;
  onDeleteAssignment: (assignmentId: string) => void;
  onAddEmployee: (employee: Omit<Employee, 'id'> & { password?: string }) => void;
  onDeleteEmployee: (employeeId: string) => void;
  onAddProject: (project: Omit<Project, 'id'>) => void;
  onDeleteProject: (projectId: string) => void;
}

export const BackOfficeHR: React.FC<BackOfficeHRProps> = ({
  hrAdmin,
  db,
  onAddHoliday,
  onDeleteHoliday,
  onAddAssignment,
  onDeleteAssignment,
  onAddEmployee,
  onDeleteEmployee,
  onAddProject,
  onDeleteProject,
}) => {
  const [activeTab, setActiveTab] = useState<'Holidays' | 'Assignments' | 'Employees' | 'Projects'>('Holidays');
  
  // Holiday Form State
  const [holidayName, setHolidayName] = useState('');
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayRegion, setHolidayRegion] = useState<'Global' | 'US' | 'IN' | 'UK'>('Global');
  const [holidayType, setHolidayType] = useState<'public' | 'optional' | 'shutdown'>('public');
  
  // Assignment Form State
  const [assignEmployeeId, setAssignEmployeeId] = useState('');
  const [assignProjectId, setAssignProjectId] = useState('');
  const [assignHours, setAssignHours] = useState(40);
  
  // Employee Form State
  const [employeeName, setEmployeeName] = useState('');
  const [employeeEmail, setEmployeeEmail] = useState('');
  const [employeeRole, setEmployeeRole] = useState<'Employee' | 'Manager' | 'HR' | 'Finance'>('Employee');
  const [employeeRegion, setEmployeeRegion] = useState<'US' | 'IN' | 'UK' | 'Global'>('Global');
  const [employeePassword, setEmployeePassword] = useState('password123');

  // Project Form State
  const [projectName, setProjectName] = useState('');
  const [projectClient, setProjectClient] = useState('');
  const [projectType, setProjectType] = useState<'billable' | 'internal'>('billable');
  
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleCreateHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayName.trim() || !holidayDate) {
      showToast("Please fill in all holiday fields", "error");
      return;
    }

    try {
      onAddHoliday({
        name: holidayName,
        date: holidayDate,
        region: holidayRegion,
        type: holidayType,
      });
      setHolidayName('');
      setHolidayDate('');
      showToast("Holiday added to Dataverse! Active timesheets have updated.", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to add holiday", "error");
    }
  };

  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignEmployeeId || !assignProjectId) {
      showToast("Please select both an employee and a project", "error");
      return;
    }

    try {
      onAddAssignment({
        employeeId: assignEmployeeId,
        projectId: assignProjectId,
        plannedHours: assignHours,
      });
      showToast("Project assignment created successfully!", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to create assignment", "error");
    }
  };

  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeName.trim() || !employeeEmail.trim()) {
      showToast("Please fill in name and email fields", "error");
      return;
    }

    try {
      onAddEmployee({
        name: employeeName,
        email: employeeEmail,
        role: employeeRole,
        region: employeeRegion,
        password: employeePassword || 'password123',
      });
      setEmployeeName('');
      setEmployeeEmail('');
      setEmployeePassword('password123');
      showToast("Employee created successfully! They can now log in.", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to create employee", "error");
    }
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || !projectClient.trim()) {
      showToast("Please fill in all project fields", "error");
      return;
    }

    try {
      onAddProject({
        name: projectName,
        client: projectClient,
        type: projectType,
      });
      setProjectName('');
      setProjectClient('');
      showToast("Project created successfully!", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to create project", "error");
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '20px', minHeight: '80vh' }}>
      
      {/* SIDEBAR NAVIGATION */}
      <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', background: 'var(--bg-secondary)' }}>
        <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px', marginBottom: '4px' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--color-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Dynamics 365 Back Office
          </span>
          <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginTop: '2px' }}>HR Administrator</h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <button 
            onClick={() => setActiveTab('Holidays')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 12px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'Holidays' ? 'var(--bg-tertiary)' : 'transparent',
              color: activeTab === 'Holidays' ? 'var(--color-primary)' : 'var(--text-secondary)',
              textAlign: 'left',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
              transition: 'all var(--transition-fast)'
            }}
          >
            <Calendar size={16} />
            <span>Holiday Calendar</span>
          </button>

          <button 
            onClick={() => setActiveTab('Assignments')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 12px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'Assignments' ? 'var(--bg-tertiary)' : 'transparent',
              color: activeTab === 'Assignments' ? 'var(--color-primary)' : 'var(--text-secondary)',
              textAlign: 'left',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
              transition: 'all var(--transition-fast)'
            }}
          >
            <FolderGit2 size={16} />
            <span>Project Assignments</span>
          </button>

          <button 
            onClick={() => setActiveTab('Employees')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 12px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'Employees' ? 'var(--bg-tertiary)' : 'transparent',
              color: activeTab === 'Employees' ? 'var(--color-primary)' : 'var(--text-secondary)',
              textAlign: 'left',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
              transition: 'all var(--transition-fast)'
            }}
          >
            <Users size={16} />
            <span>Employee Directory</span>
          </button>

          <button 
            onClick={() => setActiveTab('Projects')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 12px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'Projects' ? 'var(--bg-tertiary)' : 'transparent',
              color: activeTab === 'Projects' ? 'var(--color-primary)' : 'var(--text-secondary)',
              textAlign: 'left',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
              transition: 'all var(--transition-fast)'
            }}
          >
            <Briefcase size={16} />
            <span>Project Registry</span>
          </button>
        </div>

        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--glass-border)', paddingTop: '12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <span>HR Role: <strong>{hrAdmin.name}</strong></span>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Toast Toast alerts */}
        {message && (
          <div className="glass-panel" style={{
            padding: '12px 18px',
            borderLeft: `4px solid ${message.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)'}`,
            background: message.type === 'success' ? 'var(--color-success-glow)' : 'var(--color-danger-glow)',
            fontSize: '0.85rem',
          }}>
            {message.text}
          </div>
        )}

        {/* TAB 1: HOLIDAY MANAGER */}
        {activeTab === 'Holidays' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
            
            {/* Left: Holidays List */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>Company Holiday Register</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Active company shutdowns, regional public holidays, and optional leave dates in the Dataverse registry.
                </p>
              </div>

              <div style={{ overflowY: 'auto', maxHeight: '550px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--glass-border)' }}>
                      <th style={{ padding: '10px' }}>Date</th>
                      <th style={{ padding: '10px' }}>Holiday Name</th>
                      <th style={{ padding: '10px' }}>Region</th>
                      <th style={{ padding: '10px' }}>Type</th>
                      <th style={{ padding: '10px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {db.holidays.slice().sort((a,b) => a.date.localeCompare(b.date)).map(h => (
                      <tr key={h.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                        <td style={{ padding: '12px 10px', fontWeight: 600, color: 'var(--text-primary)' }}>{h.date}</td>
                        <td style={{ padding: '12px 10px' }}>{h.name}</td>
                        <td style={{ padding: '12px 10px' }}>
                          <span style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '4px',
                            padding: '2px 6px',
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '4px',
                            fontSize: '0.75rem'
                          }}>
                            <Globe size={10} />
                            {h.region}
                          </span>
                        </td>
                        <td style={{ padding: '12px 10px', textTransform: 'capitalize', color: h.type === 'shutdown' ? 'var(--color-danger)' : 'var(--text-secondary)' }}>
                          {h.type}
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                          <button 
                            onClick={() => onDeleteHoliday(h.id)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}
                            title="Delete holiday"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Add Holiday Form */}
            <div className="glass-panel" style={{ padding: '20px', background: 'var(--bg-secondary)', height: 'fit-content' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Plus size={16} style={{ color: 'var(--color-primary)' }} />
                New Holiday Config
              </h3>

              <form onSubmit={handleCreateHoliday} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Holiday Title</label>
                  <input 
                    type="text" 
                    value={holidayName} 
                    onChange={e => setHolidayName(e.target.value)}
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      padding: '8px 12px',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                    placeholder="e.g. Christmas Day"
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Date</label>
                  <input 
                    type="date" 
                    value={holidayDate} 
                    onChange={e => setHolidayDate(e.target.value)}
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      padding: '8px 12px',
                      fontSize: '0.85rem',
                      outline: 'none',
                      fontFamily: 'var(--font-family)'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Applicable Region</label>
                  <select 
                    value={holidayRegion} 
                    onChange={e => setHolidayRegion(e.target.value as any)}
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      padding: '8px 12px',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  >
                    <option value="Global">Global / Universal</option>
                    <option value="US">US Employees Only</option>
                    <option value="IN">IN Employees Only</option>
                    <option value="UK">UK Employees Only</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Leave Category</label>
                  <select 
                    value={holidayType} 
                    onChange={e => setHolidayType(e.target.value as any)}
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      padding: '8px 12px',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  >
                    <option value="public">Public Holiday (Paid)</option>
                    <option value="optional">Optional / Floating</option>
                    <option value="shutdown">Company Shutdown (Global)</option>
                  </select>
                </div>

                <button type="submit" className="btn btn-primary" style={{ marginTop: '6px' }}>
                  Create Holiday Registry
                </button>
              </form>
            </div>

          </div>
        )}

        {/* TAB 2: PROJECT ASSIGNMENTS */}
        {activeTab === 'Assignments' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
            
            {/* Left: Assignments List */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>Consultant Assignments Table</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Map which employees can log timesheets against which projects. Includes targeted weekly planned hours.
                </p>
              </div>

              <div style={{ overflowY: 'auto', maxHeight: '550px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--glass-border)' }}>
                      <th style={{ padding: '10px' }}>Employee</th>
                      <th style={{ padding: '10px' }}>Project Name</th>
                      <th style={{ padding: '10px' }}>Planned Hours/Wk</th>
                      <th style={{ padding: '10px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {db.assignments.map(asg => {
                      const emp = db.employees.find(e => e.id === asg.employeeId);
                      const proj = db.projects.find(p => p.id === asg.projectId);
                      return (
                        <tr key={asg.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                          <td style={{ padding: '12px 10px', fontWeight: 600, color: 'var(--text-primary)' }}>{emp?.name}</td>
                          <td style={{ padding: '12px 10px' }}>{proj?.name} ({proj?.client})</td>
                          <td style={{ padding: '12px 10px', fontWeight: 700, color: 'var(--color-primary)' }}>{asg.plannedHours} hours</td>
                          <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                            <button 
                              onClick={() => onDeleteAssignment(asg.id)}
                              style={{ background: 'transparent', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}
                              title="Revoke Assignment"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Add Assignment Form */}
            <div className="glass-panel" style={{ padding: '20px', background: 'var(--bg-secondary)', height: 'fit-content' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <UserPlus size={16} style={{ color: 'var(--color-primary)' }} />
                Assign Consultant
              </h3>

              <form onSubmit={handleCreateAssignment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Select Employee</label>
                  <select 
                    value={assignEmployeeId} 
                    onChange={e => setAssignEmployeeId(e.target.value)}
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      padding: '8px 12px',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  >
                    <option value="">-- Choose Employee --</option>
                    {db.employees.filter(e => e.role === 'Employee').map(e => (
                      <option key={e.id} value={e.id}>{e.name} ({e.region})</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Select Project</label>
                  <select 
                    value={assignProjectId} 
                    onChange={e => setAssignProjectId(e.target.value)}
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      padding: '8px 12px',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  >
                    <option value="">-- Choose Project --</option>
                    {db.projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.client})</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Target Planned Hours/Week</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="60" 
                    value={assignHours} 
                    onChange={e => setAssignHours(parseInt(e.target.value) || 0)}
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      padding: '8px 12px',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ marginTop: '6px' }}>
                  Assign Project Access
                </button>
              </form>
            </div>

          </div>
        )}

        {/* TAB 3: EMPLOYEE DIRECTORY */}
        {activeTab === 'Employees' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
            
            {/* Left: Employees List */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>Employee Directory</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Active corporate users, security profiles, and regions in the Dataverse registry.
                </p>
              </div>

              <div style={{ overflowY: 'auto', maxHeight: '550px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--glass-border)' }}>
                      <th style={{ padding: '10px' }}>Name</th>
                      <th style={{ padding: '10px' }}>Email</th>
                      <th style={{ padding: '10px' }}>Security Role</th>
                      <th style={{ padding: '10px' }}>Region</th>
                      <th style={{ padding: '10px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {db.employees.map(emp => (
                      <tr key={emp.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                        <td style={{ padding: '12px 10px', fontWeight: 600, color: 'var(--text-primary)' }}>{emp.name}</td>
                        <td style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>{emp.email}</td>
                        <td style={{ padding: '12px 10px' }}>
                          <span style={{ 
                            display: 'inline-flex',
                            padding: '2px 8px',
                            background: emp.role === 'HR' ? 'rgba(239, 68, 68, 0.1)' : 
                                        emp.role === 'Manager' ? 'rgba(59, 130, 246, 0.1)' : 
                                        emp.role === 'Finance' ? 'rgba(16, 185, 129, 0.1)' : 
                                        'rgba(255, 255, 255, 0.05)',
                            color: emp.role === 'HR' ? 'var(--color-danger)' : 
                                   emp.role === 'Manager' ? 'var(--color-primary)' : 
                                   emp.role === 'Finance' ? 'var(--color-success)' : 
                                   'var(--text-secondary)',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}>
                            {emp.role}
                          </span>
                        </td>
                        <td style={{ padding: '12px 10px' }}>
                          <span style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '4px',
                            padding: '2px 6px',
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '4px',
                            fontSize: '0.75rem'
                          }}>
                            <Globe size={10} />
                            {emp.region}
                          </span>
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                          <button 
                            onClick={() => {
                              if (emp.id === hrAdmin.id) {
                                showToast("Cannot delete your own active administrator account", "error");
                                return;
                              }
                              if (window.confirm(`Are you sure you want to delete ${emp.name}? All associated assignments and timesheets will be deleted.`)) {
                                onDeleteEmployee(emp.id);
                              }
                            }}
                            style={{ 
                              background: 'transparent', 
                              border: 'none', 
                              color: emp.id === hrAdmin.id ? 'var(--text-muted)' : 'var(--color-danger)', 
                              cursor: emp.id === hrAdmin.id ? 'not-allowed' : 'pointer',
                              opacity: emp.id === hrAdmin.id ? 0.3 : 1
                            }}
                            disabled={emp.id === hrAdmin.id}
                            title={emp.id === hrAdmin.id ? "Cannot delete yourself" : "Delete employee"}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Add Employee Form */}
            <div className="glass-panel" style={{ padding: '20px', background: 'var(--bg-secondary)', height: 'fit-content' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <UserPlus size={16} style={{ color: 'var(--color-primary)' }} />
                New Employee Config
              </h3>

              <form onSubmit={handleCreateEmployee} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Full Name</label>
                  <input 
                    type="text" 
                    value={employeeName} 
                    onChange={e => setEmployeeName(e.target.value)}
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      padding: '8px 12px',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                    placeholder="e.g. Elena Vance"
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Email Address</label>
                  <input 
                    type="email" 
                    value={employeeEmail} 
                    onChange={e => setEmployeeEmail(e.target.value)}
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      padding: '8px 12px',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                    placeholder="name@cimplesoft.local"
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Security Role</label>
                  <select 
                    value={employeeRole} 
                    onChange={e => setEmployeeRole(e.target.value as any)}
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      padding: '8px 12px',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  >
                    <option value="Employee">Employee / Consultant</option>
                    <option value="Manager">Project Manager</option>
                    <option value="HR">HR Administrator</option>
                    <option value="Finance">Finance / PMO</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Region</label>
                  <select 
                    value={employeeRegion} 
                    onChange={e => setEmployeeRegion(e.target.value as any)}
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      padding: '8px 12px',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  >
                    <option value="Global">Global / Universal</option>
                    <option value="US">United States</option>
                    <option value="IN">India</option>
                    <option value="UK">United Kingdom</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Initial Password</label>
                  <input 
                    type="password" 
                    value={employeePassword} 
                    onChange={e => setEmployeePassword(e.target.value)}
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      padding: '8px 12px',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                    placeholder="password123"
                  />
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    Defaults to `password123` if left blank.
                  </span>
                </div>

                <button type="submit" className="btn btn-primary" style={{ marginTop: '6px' }}>
                  Create Employee Profile
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 4: PROJECT REGISTRY */}
        {activeTab === 'Projects' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
            
            {/* Left: Projects List */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>Project Registry</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Active client projects, internal research initiatives, and billing classifications in the Dataverse registry.
                </p>
              </div>

              <div style={{ overflowY: 'auto', maxHeight: '550px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--glass-border)' }}>
                      <th style={{ padding: '10px' }}>Project Name</th>
                      <th style={{ padding: '10px' }}>Client</th>
                      <th style={{ padding: '10px' }}>Project Type</th>
                      <th style={{ padding: '10px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {db.projects.map(proj => (
                      <tr key={proj.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                        <td style={{ padding: '12px 10px', fontWeight: 600, color: 'var(--text-primary)' }}>{proj.name}</td>
                        <td style={{ padding: '12px 10px' }}>{proj.client}</td>
                        <td style={{ padding: '12px 10px' }}>
                          <span style={{ 
                            display: 'inline-flex',
                            padding: '2px 8px',
                            background: proj.type === 'billable' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                            color: proj.type === 'billable' ? 'var(--color-primary)' : 'var(--text-secondary)',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            textTransform: 'capitalize'
                          }}>
                            {proj.type}
                          </span>
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                          <button 
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete project "${proj.name}"? All associated assignments and timesheet hours will be permanently removed.`)) {
                                onDeleteProject(proj.id);
                              }
                            }}
                            style={{ background: 'transparent', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}
                            title="Delete project"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Add Project Form */}
            <div className="glass-panel" style={{ padding: '20px', background: 'var(--bg-secondary)', height: 'fit-content' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Plus size={16} style={{ color: 'var(--color-primary)' }} />
                New Project Config
              </h3>

              <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Project Name</label>
                  <input 
                    type="text" 
                    value={projectName} 
                    onChange={e => setProjectName(e.target.value)}
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      padding: '8px 12px',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                    placeholder="e.g. Project Omega"
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Client Name</label>
                  <input 
                    type="text" 
                    value={projectClient} 
                    onChange={e => setProjectClient(e.target.value)}
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      padding: '8px 12px',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                    placeholder="e.g. Stark Industries"
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Project Type</label>
                  <select 
                    value={projectType} 
                    onChange={e => setProjectType(e.target.value as any)}
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      padding: '8px 12px',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  >
                    <option value="billable">Billable (Client Project)</option>
                    <option value="internal">Internal (Non-Billable)</option>
                  </select>
                </div>

                <button type="submit" className="btn btn-primary" style={{ marginTop: '6px' }}>
                  Create Project Registry
                </button>
              </form>
            </div>

          </div>
        )}

      </div>

    </div>
  );
};
