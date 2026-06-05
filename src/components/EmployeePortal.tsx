import React, { useState, useEffect, useMemo } from 'react';
import { 
  Save, 
  Send, 
  Undo2, 
  Calendar, 
  Info, 
  AlertTriangle,
  History,
  FileText,
  Lock
} from 'lucide-react';
import type { Employee, DataverseDatabase, Holiday, Timesheet } from '../db';

interface EmployeePortalProps {
  employee: Employee;
  db: DataverseDatabase;
  onSaveTimesheet: (weekStartDate: string, lines: { projectId: string; hours: number[]; comments: string[] }[]) => void;
  onSubmitTimesheet: (timesheetId: string) => void;
  onRecallTimesheet: (timesheetId: string) => void;
}

const WEEKS = [
  { label: 'Week of May 25, 2026 (Approved)', value: '2026-05-25' },
  { label: 'Week of Jun 01, 2026 (Current)', value: '2026-06-01' },
  { label: 'Week of Jun 08, 2026 (Upcoming - Foundation Day)', value: '2026-06-08' },
];

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const EmployeePortal: React.FC<EmployeePortalProps> = ({
  employee,
  db,
  onSaveTimesheet,
  onSubmitTimesheet,
  onRecallTimesheet,
}) => {
  const [selectedWeek, setSelectedWeek] = useState('2026-06-01');
  const [gridLines, setGridLines] = useState<{ projectId: string; hours: number[]; comments: string[] }[]>([]);
  const [activeCommentCell, setActiveCommentCell] = useState<{ projectIdx: number; dayIdx: number } | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Get active assignments for project list
  const userAssignments = useMemo(() => {
    return db.assignments.filter(a => a.employeeId === employee.id);
  }, [db.assignments, employee.id]);

  const assignedProjects = useMemo(() => {
    return userAssignments.map(asg => db.projects.find(p => p.id === asg.projectId)).filter(Boolean);
  }, [userAssignments, db.projects]);

  // Find or mock timesheet header for selected week
  const timesheet = useMemo<Timesheet | null>(() => {
    return db.timesheets.find(t => t.employeeId === employee.id && t.weekStartDate === selectedWeek) || null;
  }, [db.timesheets, employee.id, selectedWeek]);

  // Read-only state check
  const isReadOnly = useMemo(() => {
    if (!timesheet) return false;
    return timesheet.status === 'Submitted' || timesheet.status === 'Approved';
  }, [timesheet]);

  // Calculate specific dates for the 7 columns based on selectedWeek (Monday)
  const columnDates = useMemo(() => {
    const monday = new Date(selectedWeek);
    return DAYS_OF_WEEK.map((_, idx) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + idx);
      // Format as YYYY-MM-DD
      return d.toISOString().split('T')[0];
    });
  }, [selectedWeek]);

  // Check if a specific column date is a holiday for this employee's region
  const holidayMap = useMemo(() => {
    const map: { [date: string]: Holiday } = {};
    columnDates.forEach(date => {
      const holiday = db.holidays.find(h => 
        h.date === date && (h.region === employee.region || h.region === 'Global')
      );
      if (holiday) {
        map[date] = holiday;
      }
    });
    return map;
  }, [columnDates, db.holidays, employee.region]);

  // Load grid lines when selected week changes
  useEffect(() => {
    if (timesheet) {
      const tsLines = db.lines.filter(l => l.timesheetId === timesheet.id);
      if (tsLines.length > 0) {
        // Map from DB
        const mapped = tsLines.map(l => ({
          projectId: l.projectId,
          hours: [...l.hours],
          comments: [...l.comments],
        }));
        // Ensure all assigned projects exist in the grid even if they have no lines in DB yet
        assignedProjects.forEach(proj => {
          if (proj && !mapped.some(m => m.projectId === proj.id)) {
            mapped.push({
              projectId: proj.id,
              hours: Array(7).fill(0),
              comments: Array(7).fill(''),
            });
          }
        });
        setGridLines(mapped);
        return;
      }
    }

    // Default: initialize empty grid based on assignments
    const defaultLines = assignedProjects.map(proj => ({
      projectId: proj!.id,
      hours: Array(7).fill(0),
      comments: Array(7).fill(''),
    }));
    setGridLines(defaultLines);
  }, [selectedWeek, timesheet, db.lines, assignedProjects]);

  // Handle cell hours change
  const handleHoursChange = (projectIdx: number, dayIdx: number, val: string) => {
    if (isReadOnly) return;
    const parsed = parseFloat(val) || 0;
    const bounded = Math.max(0, Math.min(24, parsed)); // limit to 24 hrs
    
    setGridLines(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy[projectIdx].hours[dayIdx] = bounded;
      return copy;
    });
  };

  // Handle cell comment change
  const handleCommentChange = (projectIdx: number, dayIdx: number, text: string) => {
    if (isReadOnly) return;
    setGridLines(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy[projectIdx].comments[dayIdx] = text;
      return copy;
    });
  };

  // Live calculations (Derived totals using useMemo for re-render optimization)
  const projectTotals = useMemo(() => {
    return gridLines.map(line => line.hours.reduce((sum, h) => sum + h, 0));
  }, [gridLines]);

  const dailyTotals = useMemo(() => {
    const totals = Array(7).fill(0);
    gridLines.forEach(line => {
      line.hours.forEach((h, idx) => {
        totals[idx] += h;
      });
    });
    return totals;
  }, [gridLines]);

  const grandTotal = useMemo(() => {
    return dailyTotals.reduce((sum, h) => sum + h, 0);
  }, [dailyTotals]);

  // Validation: Check if there are hours worked on a holiday that lack a comment
  const validationAlerts = useMemo(() => {
    const alerts: string[] = [];
    gridLines.forEach((line) => {
      const projName = db.projects.find(p => p.id === line.projectId)?.name || 'Unknown Project';
      line.hours.forEach((hours, dayIdx) => {
        const dateStr = columnDates[dayIdx];
        const holiday = holidayMap[dateStr];
        if (holiday && hours > 0) {
          const comment = line.comments[dayIdx]?.trim();
          if (!comment) {
            alerts.push(`Comment required: Project "${projName}" on ${DAYS_OF_WEEK[dayIdx]} (${dateStr}) is a holiday (${holiday.name}).`);
          }
        }
      });
    });
    return alerts;
  }, [gridLines, columnDates, holidayMap, db.projects]);

  // Save draft action
  const handleSaveDraft = () => {
    try {
      onSaveTimesheet(selectedWeek, gridLines);
      showToast('Timesheet draft saved successfully!', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to save timesheet', 'error');
    }
  };

  // Submit action
  const handleSubmit = () => {
    if (validationAlerts.length > 0) {
      showToast('Cannot submit. Please resolve holiday comment warnings.', 'error');
      return;
    }
    if (grandTotal === 0) {
      showToast('Cannot submit empty timesheet (total hours must be greater than 0).', 'error');
      return;
    }

    try {
      // Auto-save first
      onSaveTimesheet(selectedWeek, gridLines);
      // Retrieve updated timesheet
      const updatedDb = db;
      const currentTs = updatedDb.timesheets.find(t => t.employeeId === employee.id && t.weekStartDate === selectedWeek);
      if (currentTs) {
        onSubmitTimesheet(currentTs.id);
        showToast('Timesheet submitted for approval!', 'success');
      } else {
        throw new Error("Timesheet record not synchronized");
      }
    } catch (e: any) {
      showToast(e.message || 'Failed to submit timesheet', 'error');
    }
  };

  // Recall action
  const handleRecall = () => {
    if (!timesheet) return;
    try {
      onRecallTimesheet(timesheet.id);
      showToast('Timesheet recalled. You can now edit and re-submit.', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to recall timesheet', 'error');
    }
  };

  const showToast = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5050);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Title block */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', marginBottom: '4px' }}>Employee Timesheet Portal</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Welcome back, <strong>{employee.name}</strong> ({employee.region} Region). Manage and submit your weekly hours below.
          </p>
        </div>

        {/* Date Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Calendar size={16} style={{ color: 'var(--color-primary)' }} />
          <select 
            value={selectedWeek} 
            onChange={(e) => setSelectedWeek(e.target.value)}
            className="btn btn-secondary"
            style={{ fontWeight: 600, padding: '8px 12px' }}
          >
            {WEEKS.map(w => (
              <option key={w.value} value={w.value}>{w.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Toast Alert */}
      {message && (
        <div className="glass-panel" style={{
          padding: '12px 18px',
          borderLeft: `4px solid ${message.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)'}`,
          background: message.type === 'success' ? 'var(--color-success-glow)' : 'var(--color-danger-glow)',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <Info size={16} />
          <span>{message.text}</span>
        </div>
      )}

      {/* Timesheet Form Card */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Header Information */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Timesheet Status:</span>
            <span className={`badge badge-${(timesheet?.status || 'Draft').toLowerCase()}`}>
              {timesheet?.status || 'Draft'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {!isReadOnly ? (
              <>
                <button onClick={handleSaveDraft} className="btn btn-secondary">
                  <Save size={16} />
                  Save Draft
                </button>
                <button onClick={handleSubmit} className="btn btn-primary">
                  <Send size={16} />
                  Submit for Approval
                </button>
              </>
            ) : timesheet?.status === 'Submitted' ? (
              <button onClick={handleRecall} className="btn btn-secondary" style={{ borderColor: 'var(--color-warning)' }}>
                <Undo2 size={16} style={{ color: 'var(--color-warning)' }} />
                Recall Timesheet
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <Lock size={14} />
                <span>Timesheet is locked (Approved / Awaiting review)</span>
              </div>
            )}
          </div>
        </div>

        {/* Rejection/Correction Banner */}
        {timesheet?.status === 'Rejected' && timesheet.rejectionReason && (
          <div className="glass-panel" style={{
            background: 'rgba(239, 68, 68, 0.05)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            padding: '14px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px'
          }}>
            <AlertTriangle size={18} style={{ color: 'var(--color-danger)', marginTop: '2px' }} />
            <div>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--color-danger)', fontWeight: 700, marginBottom: '2px' }}>
                Timesheet Rejected by Project Manager
              </h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontStyle: 'italic' }}>
                " {timesheet.rejectionReason} "
              </p>
            </div>
          </div>
        )}

        {/* The Weekly Entry Grid */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
            <thead>
              <tr>
                <th style={{ padding: '12px', color: 'var(--text-secondary)', borderBottom: '2px solid var(--glass-border)', width: '25%' }}>Project / Client</th>
                {DAYS_OF_WEEK.map((day, idx) => {
                  const date = columnDates[idx];
                  const holiday = holidayMap[date];
                  return (
                    <th 
                      key={day} 
                      style={{ 
                        padding: '12px', 
                        color: holiday ? 'var(--color-warning)' : 'var(--text-secondary)', 
                        borderBottom: '2px solid var(--glass-border)',
                        textAlign: 'center',
                        background: holiday ? 'rgba(245, 158, 11, 0.02)' : 'transparent',
                        width: '9%',
                        position: 'relative'
                      }}
                      title={holiday ? `${holiday.name} (${holiday.type} holiday)` : undefined}
                    >
                      <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{day}</div>
                      <div style={{ fontSize: '0.65rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                        {date.substring(5)}
                      </div>
                      {holiday && (
                        <span style={{
                          display: 'block',
                          fontSize: '0.55rem',
                          color: 'var(--color-warning)',
                          fontWeight: 700,
                          marginTop: '2px'
                        }}>
                          {holiday.name.substring(0, 10)}...
                        </span>
                      )}
                    </th>
                  );
                })}
                <th style={{ padding: '12px', color: 'var(--text-secondary)', borderBottom: '2px solid var(--glass-border)', textAlign: 'center', width: '10%' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {gridLines.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No project assignments found for you. Please contact HR to assign you to active projects.
                  </td>
                </tr>
              ) : (
                gridLines.map((line, projIdx) => {
                  const project = db.projects.find(p => p.id === line.projectId);
                  return (
                    <tr key={line.projectId} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                      {/* Project Info */}
                      <td style={{ padding: '16px 12px' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{project?.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{project?.client}</div>
                        <span style={{ fontSize: '0.65rem', padding: '2px 6px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', textTransform: 'capitalize', marginTop: '4px', display: 'inline-block' }}>
                          {project?.type}
                        </span>
                      </td>

                      {/* Daily Hours Inputs */}
                      {line.hours.map((hrs, dayIdx) => {
                        const date = columnDates[dayIdx];
                        const holiday = holidayMap[date];
                        const commentText = line.comments[dayIdx] || '';
                        const hasHours = hrs > 0;
                        const isHolidayWorkMissingComment = holiday && hasHours && !commentText.trim();

                        return (
                          <td 
                            key={dayIdx} 
                            style={{ 
                              padding: '12px 6px', 
                              textAlign: 'center',
                              background: holiday ? 'rgba(245, 158, 11, 0.04)' : 'transparent',
                            }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                              <input 
                                type="number" 
                                min="0" 
                                max="24"
                                step="0.5"
                                disabled={isReadOnly}
                                value={hrs === 0 ? '' : hrs} 
                                onChange={(e) => handleHoursChange(projIdx, dayIdx, e.target.value)}
                                style={{
                                  width: '56px',
                                  height: '36px',
                                  background: isReadOnly ? 'transparent' : 'var(--bg-secondary)',
                                  border: isReadOnly 
                                    ? 'none' 
                                    : isHolidayWorkMissingComment 
                                      ? '1px solid var(--color-danger)' 
                                      : holiday 
                                        ? '1px solid var(--color-warning)' 
                                        : '1px solid var(--glass-border)',
                                  borderRadius: '6px',
                                  color: hrs > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                                  textAlign: 'center',
                                  fontSize: '0.9rem',
                                  fontWeight: hrs > 0 ? 700 : 400,
                                  outline: 'none',
                                  transition: 'all var(--transition-fast)'
                                }}
                                placeholder="0"
                              />

                              {/* Comment indicator/button */}
                              {(hasHours || isReadOnly) && (
                                <button
                                  onClick={() => setActiveCommentCell({ projectIdx: projIdx, dayIdx: dayIdx })}
                                  style={{
                                    background: commentText ? 'rgba(124, 58, 237, 0.2)' : 'transparent',
                                    border: 'none',
                                    borderRadius: '4px',
                                    color: commentText 
                                      ? 'var(--color-primary)' 
                                      : isHolidayWorkMissingComment 
                                        ? 'var(--color-danger)' 
                                        : 'var(--text-muted)',
                                    fontSize: '0.65rem',
                                    cursor: 'pointer',
                                    padding: '2px 4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '2px'
                                  }}
                                  title={commentText ? `Comment: ${commentText}` : "Add comment"}
                                >
                                  <FileText size={10} />
                                  <span>{commentText ? 'View' : holiday ? 'Req*' : 'Add'}</span>
                                </button>
                              )}
                            </div>
                          </td>
                        );
                      })}

                      {/* Project Row Total */}
                      <td style={{ padding: '12px', textAlign: 'center', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                        {projectTotals[projIdx]}h
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Totals Row */}
            {gridLines.length > 0 && (
              <tfoot>
                <tr style={{ background: 'var(--bg-secondary)', borderTop: '2px solid var(--glass-border)' }}>
                  <td style={{ padding: '16px 12px', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Daily Totals</td>
                  {dailyTotals.map((tot, idx) => (
                    <td key={idx} style={{ padding: '16px 6px', textAlign: 'center', fontWeight: 700, fontSize: '0.95rem', color: tot > 40 ? 'var(--color-danger)' : 'var(--text-primary)' }}>
                      {tot}h
                    </td>
                  ))}
                  <td style={{ padding: '16px 12px', textAlign: 'center', fontWeight: 800, fontSize: '1.05rem', color: 'var(--color-primary)' }}>
                    {grandTotal}h
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Comment Modal overlay */}
        {activeCommentCell !== null && (
          <div className="modal-overlay" onClick={() => setActiveCommentCell(null)}>
            <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
              <h3 className="modal-title">
                {isReadOnly ? 'View Comment' : 'Add Comment / Work Explanation'}
              </h3>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Project: <strong>{db.projects.find(p => p.id === gridLines[activeCommentCell.projectIdx].projectId)?.name}</strong> | Day: <strong>{DAYS_OF_WEEK[activeCommentCell.dayIdx]} ({columnDates[activeCommentCell.dayIdx]})</strong>
                {holidayMap[columnDates[activeCommentCell.dayIdx]] && (
                  <div style={{ color: 'var(--color-warning)', marginTop: '4px', fontWeight: 600 }}>
                    ⚠️ Holiday: {holidayMap[columnDates[activeCommentCell.dayIdx]].name}. A comment is mandatory to explain hours worked.
                  </div>
                )}
              </div>
              <div className="modal-body">
                <textarea
                  readOnly={isReadOnly}
                  value={gridLines[activeCommentCell.projectIdx].comments[activeCommentCell.dayIdx] || ''}
                  onChange={(e) => handleCommentChange(activeCommentCell.projectIdx, activeCommentCell.dayIdx, e.target.value)}
                  placeholder="Enter a description of the tasks performed..."
                />
              </div>
              <div className="modal-actions">
                <button onClick={() => setActiveCommentCell(null)} className="btn btn-primary">
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Holiday Validation Warnings Area */}
      {validationAlerts.length > 0 && (
        <div className="glass-panel" style={{
          padding: '16px 20px',
          background: 'rgba(239, 68, 68, 0.03)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <h4 style={{ fontSize: '0.9rem', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
            <AlertTriangle size={16} />
            Submission Blocked: Missing Holiday Comments
          </h4>
          <ul style={{ fontSize: '0.8rem', color: 'var(--text-primary)', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {validationAlerts.map((alt, idx) => (
              <li key={idx}>{alt}</li>
            ))}
          </ul>
        </div>
      )}

      {/* History Log Panel */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <History size={16} style={{ color: 'var(--color-primary)' }} />
          Timesheet History & Status Log
        </h3>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--glass-border)' }}>
                <th style={{ padding: '10px' }}>Week Ending / Start</th>
                <th style={{ padding: '10px' }}>Status</th>
                <th style={{ padding: '10px' }}>Submitted Date</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>Total Hours</th>
                <th style={{ padding: '10px' }}>Rejection/Feedback Details</th>
              </tr>
            </thead>
            <tbody>
              {db.timesheets.filter(t => t.employeeId === employee.id).length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>No historical timesheets found.</td>
                </tr>
              ) : (
                db.timesheets
                  .filter(t => t.employeeId === employee.id)
                  .map(ts => {
                    // Calculate totals from db.lines
                    const tsLines = db.lines.filter(l => l.timesheetId === ts.id);
                    const totalHrs = tsLines.reduce((acc, line) => acc + line.hours.reduce((s, h) => s + h, 0), 0);

                    return (
                      <tr 
                        key={ts.id} 
                        onClick={() => setSelectedWeek(ts.weekStartDate)}
                        style={{ 
                          borderBottom: '1px solid var(--glass-border)',
                          cursor: 'pointer',
                          background: selectedWeek === ts.weekStartDate ? 'rgba(255, 255, 255, 0.02)' : 'transparent'
                        }}
                      >
                        <td style={{ padding: '12px 10px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          Week of {ts.weekStartDate}
                        </td>
                        <td style={{ padding: '12px 10px' }}>
                          <span className={`badge badge-${ts.status.toLowerCase()}`}>
                            {ts.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>
                          {ts.submittedAt ? new Date(ts.submittedAt).toLocaleDateString() : '-'}
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 700 }}>
                          {totalHrs}h
                        </td>
                        <td style={{ padding: '12px 10px', color: ts.rejectionReason ? 'var(--color-danger)' : 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                          {ts.rejectionReason || 'No feedback'}
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
