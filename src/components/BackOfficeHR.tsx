import React, { useState } from 'react';
import { 
  Calendar, 
  UserPlus, 
  Trash2, 
  Plus, 
  Globe, 
  FolderGit2 
} from 'lucide-react';
import type { Employee, DataverseDatabase, Holiday, ProjectAssignment } from '../db';

interface BackOfficeHRProps {
  hrAdmin: Employee;
  db: DataverseDatabase;
  onAddHoliday: (holiday: Omit<Holiday, 'id'>) => void;
  onDeleteHoliday: (holidayId: string) => void;
  onAddAssignment: (assignment: Omit<ProjectAssignment, 'id'>) => void;
  onDeleteAssignment: (assignmentId: string) => void;
}

export const BackOfficeHR: React.FC<BackOfficeHRProps> = ({
  hrAdmin,
  db,
  onAddHoliday,
  onDeleteHoliday,
  onAddAssignment,
  onDeleteAssignment,
}) => {
  const [activeTab, setActiveTab] = useState<'Holidays' | 'Assignments'>('Holidays');
  
  // Holiday Form State
  const [holidayName, setHolidayName] = useState('');
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayRegion, setHolidayRegion] = useState<'Global' | 'US' | 'IN' | 'UK'>('Global');
  const [holidayType, setHolidayType] = useState<'public' | 'optional' | 'shutdown'>('public');
  
  // Assignment Form State
  const [assignEmployeeId, setAssignEmployeeId] = useState('');
  const [assignProjectId, setAssignProjectId] = useState('');
  const [assignHours, setAssignHours] = useState(40);
  
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

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '20px', minHeight: '80vh' }}>
      
      {/* SIDEBAR NAVIGATION */}
      <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', background: 'var(--bg-secondary)' }}>
        <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px', marginBottom: '4px' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--color-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Dynamics 365 Back Office
          </span>
          <h3 style={{ fontSize: '1rem', color: '#fff', marginTop: '2px' }}>HR Administrator</h3>
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
                <h3 style={{ fontSize: '1.1rem', color: '#fff' }}>Company Holiday Register</h3>
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
                        <td style={{ padding: '12px 10px', fontWeight: 600, color: '#fff' }}>{h.date}</td>
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
              <h3 style={{ fontSize: '1rem', color: '#fff', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                      color: '#fff',
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
                      color: '#fff',
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
                      color: '#fff',
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
                      color: '#fff',
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
                <h3 style={{ fontSize: '1.1rem', color: '#fff' }}>Consultant Assignments Table</h3>
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
                          <td style={{ padding: '12px 10px', fontWeight: 600, color: '#fff' }}>{emp?.name}</td>
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
              <h3 style={{ fontSize: '1rem', color: '#fff', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                      color: '#fff',
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
                      color: '#fff',
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
                      color: '#fff',
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

      </div>

    </div>
  );
};
