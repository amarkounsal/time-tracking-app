import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Clock, 
  ListFilter,
  AlertTriangle,
  Send,
  UserCheck
} from 'lucide-react';
import type { Employee, DataverseDatabase, Timesheet, TimesheetLine } from '../db';

interface BackOfficePMProps {
  manager: Employee;
  db: DataverseDatabase;
  onApproveTimesheet: (timesheetId: string) => void;
  onRejectTimesheet: (timesheetId: string, reason: string) => void;
  onSendBackTimesheet: (timesheetId: string, reason: string) => void;
  onTriggerEscalationCheck: () => void;
}

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const BackOfficePM: React.FC<BackOfficePMProps> = ({
  manager,
  db,
  onApproveTimesheet,
  onRejectTimesheet,
  onSendBackTimesheet,
  onTriggerEscalationCheck,
}) => {
  const [selectedTimesheetId, setSelectedTimesheetId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'Pending' | 'All'>('Pending');
  const [modalType, setModalType] = useState<'Reject' | 'Correction' | null>(null);
  const [reasonText, setReasonText] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Run a real-time interval to update SLA timers and trigger escalations
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
      onTriggerEscalationCheck();
    }, 1000);
    return () => clearInterval(interval);
  }, [onTriggerEscalationCheck]);

  // Filter timesheets
  const displayedTimesheets = db.timesheets.filter(t => {
    // Show submitted items for approval
    if (filter === 'Pending') {
      return t.status === 'Submitted';
    }
    // Show all except drafts
    return t.status !== 'Draft';
  });

  const selectedTimesheet = db.timesheets.find(t => t.id === selectedTimesheetId);
  const selectedEmployee = selectedTimesheet ? db.employees.find(e => e.id === selectedTimesheet.employeeId) : null;
  const selectedLines = selectedTimesheet ? db.lines.filter(l => l.timesheetId === selectedTimesheet.id) : [];

  // Calculate specific dates for grid column headers based on selectedTimesheet
  const getColumnDates = (weekStart: string) => {
    const monday = new Date(weekStart);
    return DAYS_OF_WEEK.map((_, idx) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + idx);
      return d.toISOString().split('T')[0];
    });
  };

  // Check if a line contains holiday work
  const getHolidayWorkInfo = (line: TimesheetLine, weekStartDate: string, empRegion: 'US' | 'IN' | 'UK' | 'Global') => {
    const dates = getColumnDates(weekStartDate);
    const exceptions: { day: string; date: string; hours: number; holidayName: string; comment: string }[] = [];
    
    line.hours.forEach((hrs, idx) => {
      if (hrs > 0) {
        const date = dates[idx];
        const holiday = db.holidays.find(h => h.date === date && (h.region === empRegion || h.region === 'Global'));
        if (holiday) {
          exceptions.push({
            day: DAYS_OF_WEEK[idx],
            date,
            hours: hrs,
            holidayName: holiday.name,
            comment: line.comments[idx] || '',
          });
        }
      }
    });
    return exceptions;
  };

  // Get SLA status and time remaining string
  const getSlaInfo = (ts: Timesheet) => {
    if (ts.status !== 'Submitted' || !ts.slaExpiresAt) return { text: 'N/A', class: '', isBreached: false };
    
    const expires = new Date(ts.slaExpiresAt).getTime();
    const now = currentTime.getTime();
    const diff = expires - now;

    if (diff <= 0 || ts.isEscalated) {
      return { text: 'EXPIRED - Escalated to HR', class: 'text-danger', isBreached: true };
    }

    const hrs = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);

    let className = 'text-success';
    if (hrs < 6) className = 'text-warning'; // Less than 6 hours left

    return { 
      text: `${hrs}h ${mins}m ${secs}s remaining`, 
      class: className, 
      isBreached: false 
    };
  };

  const handleApprove = () => {
    if (!selectedTimesheetId) return;
    onApproveTimesheet(selectedTimesheetId);
    setSelectedTimesheetId(null);
  };

  const handleActionWithReason = () => {
    if (!selectedTimesheetId || !reasonText.trim()) return;
    
    if (modalType === 'Reject') {
      onRejectTimesheet(selectedTimesheetId, reasonText);
    } else if (modalType === 'Correction') {
      onSendBackTimesheet(selectedTimesheetId, reasonText);
    }
    
    setReasonText('');
    setModalType(null);
    setSelectedTimesheetId(null);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '20px', minHeight: '80vh' }}>
      
      {/* SIDEBAR NAVIGATION (Dynamics 365 Mock sidebar) */}
      <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', background: 'var(--bg-secondary)' }}>
        <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px', marginBottom: '4px' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--color-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Dynamics 365 Back Office
          </span>
          <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginTop: '2px' }}>Project Manager</h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <button 
            onClick={() => { setFilter('Pending'); setSelectedTimesheetId(null); }}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 12px',
              borderRadius: '8px',
              border: 'none',
              background: filter === 'Pending' ? 'var(--bg-tertiary)' : 'transparent',
              color: filter === 'Pending' ? 'var(--color-primary)' : 'var(--text-secondary)',
              textAlign: 'left',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
              transition: 'all var(--transition-fast)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} />
              <span>Pending Approvals</span>
            </div>
            <span style={{
              background: 'var(--color-primary)',
              color: 'var(--text-primary)',
              fontSize: '0.7rem',
              padding: '2px 6px',
              borderRadius: '4px',
            }}>
              {db.timesheets.filter(t => t.status === 'Submitted').length}
            </span>
          </button>

          <button 
            onClick={() => { setFilter('All'); setSelectedTimesheetId(null); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 12px',
              borderRadius: '8px',
              border: 'none',
              background: filter === 'All' ? 'var(--bg-tertiary)' : 'transparent',
              color: filter === 'All' ? 'var(--color-primary)' : 'var(--text-secondary)',
              textAlign: 'left',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
              transition: 'all var(--transition-fast)'
            }}
          >
            <ListFilter size={16} />
            <span>All Timesheets</span>
          </button>
        </div>

        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--glass-border)', paddingTop: '12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <UserCheck size={12} />
            <span>Logged in: <strong>{manager.name}</strong></span>
          </div>
          <span>SLA Target: 24h review limit</span>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Timesheet List Header */}
        <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>
              {filter === 'Pending' ? 'Timesheet Approvals Queue' : 'All Logs'}
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Review timesheet grid submissions, inspect holiday work explanations, and manage approval SLAs.
            </p>
          </div>
        </div>

        {/* Dynamic Split Layout: Table vs Detail view */}
        <div style={{ display: 'grid', gridTemplateColumns: selectedTimesheetId ? '380px 1fr' : '1fr', gap: '20px', transition: 'all 0.3s' }}>
          
          {/* List of Timesheets */}
          <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Grid Records ({displayedTimesheets.length})
            </span>

            {displayedTimesheets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No timesheets found in this queue.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {displayedTimesheets.map(ts => {
                  const emp = db.employees.find(e => e.id === ts.employeeId);
                  const tsLines = db.lines.filter(l => l.timesheetId === ts.id);
                  const totalHrs = tsLines.reduce((acc, l) => acc + l.hours.reduce((s, h) => s + h, 0), 0);
                  const isSelected = ts.id === selectedTimesheetId;
                  const sla = getSlaInfo(ts);

                  return (
                    <div 
                      key={ts.id} 
                      onClick={() => setSelectedTimesheetId(ts.id)}
                      style={{
                        padding: '14px',
                        borderRadius: '8px',
                        border: isSelected ? '1px solid var(--color-primary)' : '1px solid var(--glass-border)',
                        background: isSelected ? 'rgba(124, 58, 237, 0.04)' : 'rgba(255, 255, 255, 0.01)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        transition: 'all var(--transition-fast)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{emp?.name}</strong>
                        <span className={`badge badge-${ts.status.toLowerCase()}`} style={{ fontSize: '0.65rem' }}>
                          {ts.status}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <span>Week: {ts.weekStartDate}</span>
                        <span>Hours: <strong>{totalHrs}h</strong></span>
                      </div>

                      {/* Render SLA badge if submitted */}
                      {ts.status === 'Submitted' && (
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '4px', 
                          fontSize: '0.7rem', 
                          marginTop: '4px',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          background: ts.isEscalated ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.03)'
                        }}>
                          <Clock size={12} className={sla.class} />
                          <span className={sla.class}>SLA: {sla.text}</span>
                          {ts.isEscalated && (
                            <span style={{ color: 'var(--color-danger)', fontWeight: 700, marginLeft: 'auto' }}>
                              ⚠️ ESCALATED
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Details Drawer */}
          {selectedTimesheetId && selectedTimesheet && selectedEmployee && (
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Detail Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>Reviewing Timesheet</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Employee: <strong>{selectedEmployee.name}</strong> ({selectedEmployee.region} Region) | Week of: <strong>{selectedTimesheet.weekStartDate}</strong>
                  </span>
                </div>
                <button 
                  onClick={() => setSelectedTimesheetId(null)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Close Detail
                </button>
              </div>

              {/* SLA status details */}
              {selectedTimesheet.status === 'Submitted' && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '6px',
                  background: selectedTimesheet.isEscalated ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.05)',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertCircle size={16} style={{ color: selectedTimesheet.isEscalated ? 'var(--color-danger)' : 'var(--color-success)' }} />
                  <div>
                    SLA Status: <strong>{getSlaInfo(selectedTimesheet).text}</strong>
                    {selectedTimesheet.isEscalated && (
                      <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                        This timesheet is past the 24-hour PM review SLA. Review capability has been copied to HR.
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Exception Logs (Holiday Work) */}
              {(() => {
                const allExceptions: any[] = [];
                selectedLines.forEach(line => {
                  const lineExceptions = getHolidayWorkInfo(line, selectedTimesheet.weekStartDate, selectedEmployee.region);
                  lineExceptions.forEach(e => {
                    allExceptions.push({
                      project: db.projects.find(p => p.id === line.projectId)?.name,
                      ...e
                    });
                  });
                });

                if (allExceptions.length > 0) {
                  return (
                    <div style={{
                      padding: '12px 16px',
                      background: 'rgba(245, 158, 11, 0.05)',
                      border: '1px solid rgba(245, 158, 11, 0.2)',
                      borderRadius: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-warning)', fontWeight: 700, fontSize: '0.85rem' }}>
                        <AlertTriangle size={16} />
                        Holiday Exceptions Detected
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-primary)' }}>
                        {allExceptions.map((ex, i) => (
                          <div key={i} style={{ marginBottom: '6px', borderBottom: i < allExceptions.length - 1 ? '1px dashed rgba(245, 158, 11, 0.15)' : 'none', paddingBottom: '4px' }}>
                            Worked <strong>{ex.hours} hours</strong> on <strong>{ex.holidayName}</strong> ({ex.date}) for <strong>{ex.project}</strong>.
                            <div style={{ fontStyle: 'italic', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              Comment: "{ex.comment || 'No comment provided'}"
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Timesheet Details Grid */}
              <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--bg-secondary)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '10px' }}>Project</th>
                      {DAYS_OF_WEEK.map(d => <th key={d} style={{ padding: '10px', textAlign: 'center' }}>{d}</th>)}
                      <th style={{ padding: '10px', textAlign: 'center' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedLines.map(line => {
                      const proj = db.projects.find(p => p.id === line.projectId);
                      const dates = getColumnDates(selectedTimesheet.weekStartDate);
                      const totalHrs = line.hours.reduce((s, h) => s + h, 0);

                      return (
                        <tr key={line.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                          <td style={{ padding: '12px 10px', fontWeight: 600 }}>
                            <div>{proj?.name}</div>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{proj?.client}</span>
                          </td>
                          {line.hours.map((hrs, idx) => {
                            const date = dates[idx];
                            const isHoliday = db.holidays.some(h => h.date === date && (h.region === selectedEmployee.region || h.region === 'Global'));
                            const comment = line.comments[idx];

                            return (
                              <td 
                                key={idx} 
                                style={{ 
                                  padding: '12px 6px', 
                                  textAlign: 'center',
                                  background: isHoliday ? 'rgba(245, 158, 11, 0.04)' : 'transparent',
                                  color: hrs > 0 ? 'var(--text-primary)' : 'var(--text-muted)'
                                }}
                                title={comment ? `Comment: ${comment}` : undefined}
                              >
                                <div style={{ fontWeight: hrs > 0 ? 700 : 400 }}>{hrs || 0}</div>
                                {comment && (
                                  <span style={{ fontSize: '0.6rem', color: 'var(--color-primary)', display: 'block' }}>
                                    💬
                                  </span>
                                )}
                              </td>
                            );
                          })}
                          <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 700, color: 'var(--color-primary)' }}>
                            {totalHrs}h
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Action Buttons */}
              {selectedTimesheet.status === 'Submitted' && (
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px', borderTop: '1px solid var(--glass-border)', paddingTop: '16px' }}>
                  <button 
                    onClick={handleApprove} 
                    className="btn btn-success"
                    style={{ flex: 1 }}
                  >
                    <CheckCircle size={16} />
                    Approve Timesheet
                  </button>
                  <button 
                    onClick={() => setModalType('Correction')} 
                    className="btn btn-secondary"
                    style={{ flex: 1, borderColor: 'var(--color-warning)' }}
                  >
                    Send for Correction
                  </button>
                  <button 
                    onClick={() => setModalType('Reject')} 
                    className="btn btn-danger"
                    style={{ flex: 1 }}
                  >
                    <XCircle size={16} />
                    Reject Timesheet
                  </button>
                </div>
              )}

              {/* Rejected Metadata display */}
              {selectedTimesheet.status === 'Rejected' && selectedTimesheet.rejectionReason && (
                <div style={{ fontSize: '0.8rem', color: 'var(--color-danger)', borderTop: '1px solid var(--glass-border)', paddingTop: '12px' }}>
                  <strong>Rejection feedback:</strong>
                  <div style={{ fontStyle: 'italic', color: 'var(--text-primary)', marginTop: '4px' }}>
                    "{selectedTimesheet.rejectionReason}"
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

      </div>

      {/* REJECTION / CORRECTION MODAL */}
      {modalType !== null && (
        <div className="modal-overlay" onClick={() => setModalType(null)}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">
              {modalType === 'Reject' ? 'Reject Timesheet' : 'Return for Correction'}
            </h3>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Provide a clear, mandatory reason. The employee will receive an instant notification to review this comment.
            </div>
            
            <div className="modal-body">
              <textarea
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                placeholder={
                  modalType === 'Reject' 
                    ? "Enter rejection reason (e.g. Billable hours misallocated to internal project)..." 
                    : "Enter correction guidance (e.g. Please add comments explaining the weekend work hours)..."
                }
                required
              />
            </div>

            <div className="modal-actions">
              <button onClick={() => setModalType(null)} className="btn btn-secondary">
                Cancel
              </button>
              <button 
                onClick={handleActionWithReason} 
                className={modalType === 'Reject' ? 'btn btn-danger' : 'btn btn-primary'}
                disabled={!reasonText.trim()}
              >
                <Send size={14} />
                Submit Feedback
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
