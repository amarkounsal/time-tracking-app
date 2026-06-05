import React, { useMemo } from 'react';
import { 
  BarChart3, 
  Percent, 
  Clock, 
  AlertOctagon, 
  Briefcase, 
  TrendingUp
} from 'lucide-react';
import type { DataverseDatabase, Employee } from '../db';

interface DashboardFinanceProps {
  financeUser: Employee;
  db: DataverseDatabase;
}

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const DashboardFinance: React.FC<DashboardFinanceProps> = ({
  financeUser,
  db,
}) => {
  
  // Calculate specific column dates for any week starting date
  const getWeekDates = (weekStart: string) => {
    const monday = new Date(weekStart);
    return DAYS_OF_WEEK.map((_, idx) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + idx);
      return d.toISOString().split('T')[0];
    });
  };

  // --- REPORT 1: PROJECT HOURS (ACTUAL VS PLANNED) ---
  const projectHoursReport = useMemo(() => {
    const report: { [projId: string]: { planned: number; actual: number; name: string; client: string; employees: { [empName: string]: number } } } = {};

    // Initialize with projects
    db.projects.forEach(p => {
      report[p.id] = {
        planned: 0,
        actual: 0,
        name: p.name,
        client: p.client,
        employees: {},
      };
    });

    // Sum planned hours from assignments
    db.assignments.forEach(asg => {
      if (report[asg.projectId]) {
        report[asg.projectId].planned += asg.plannedHours;
      }
    });

    // Sum actual approved hours from timesheets
    db.timesheets.forEach(ts => {
      // We only report on Approved timesheets for finance billing!
      if (ts.status === 'Approved') {
        const empName = db.employees.find(e => e.id === ts.employeeId)?.name || 'Unknown';
        const tsLines = db.lines.filter(l => l.timesheetId === ts.id);
        
        tsLines.forEach(line => {
          if (report[line.projectId]) {
            const lineSum = line.hours.reduce((s, h) => s + h, 0);
            report[line.projectId].actual += lineSum;
            
            // Break down by employee
            if (!report[line.projectId].employees[empName]) {
              report[line.projectId].employees[empName] = 0;
            }
            report[line.projectId].employees[empName] += lineSum;
          }
        });
      }
    });

    return Object.values(report);
  }, [db.projects, db.assignments, db.timesheets, db.lines, db.employees]);

  // --- REPORT 2: CONSULTANT UTILIZATION ---
  const utilizationReport = useMemo(() => {
    const report: { [empId: string]: { name: string; billable: number; total: number; utilization: number } } = {};

    // Gather only core active employees
    db.employees.filter(e => e.role === 'Employee').forEach(e => {
      report[e.id] = {
        name: e.name,
        billable: 0,
        total: 0,
        utilization: 0,
      };
    });

    // Sum actual hours from Approved timesheets
    db.timesheets.forEach(ts => {
      if (ts.status === 'Approved' && report[ts.employeeId]) {
        const tsLines = db.lines.filter(l => l.timesheetId === ts.id);
        tsLines.forEach(line => {
          const proj = db.projects.find(p => p.id === line.projectId);
          const lineSum = line.hours.reduce((s, h) => s + h, 0);

          report[ts.employeeId].total += lineSum;
          if (proj && proj.type === 'billable') {
            report[ts.employeeId].billable += lineSum;
          }
        });
      }
    });

    // Compute utilization: (Billable Hours / 40 hours target) * 100
    // Elena Vance week of May 25 is approved, John's is pending, so Elena has approved data.
    Object.keys(report).forEach(empId => {
      const totalHoursTarget = 40; // Standard single-week benchmark
      const empData = report[empId];
      if (empData.total > 0) {
        empData.utilization = Math.round((empData.billable / totalHoursTarget) * 100);
      }
    });

    return Object.values(report);
  }, [db.employees, db.timesheets, db.lines, db.projects]);

  // --- REPORT 3: PENDING APPROVALS AGING ---
  const pendingApprovalsReport = useMemo(() => {
    const pending = db.timesheets.filter(t => t.status === 'Submitted');
    
    return pending.map(ts => {
      const emp = db.employees.find(e => e.id === ts.employeeId);
      const lines = db.lines.filter(l => l.timesheetId === ts.id);
      const totalHrs = lines.reduce((acc, l) => acc + l.hours.reduce((s, h) => s + h, 0), 0);

      // Compute age in hours since submission
      let hoursPending = 0;
      if (ts.submittedAt) {
        const diffMs = Date.now() - new Date(ts.submittedAt).getTime();
        hoursPending = Math.round(diffMs / (1000 * 60 * 60));
      }

      return {
        id: ts.id,
        employeeName: emp?.name || 'Unknown',
        weekStartDate: ts.weekStartDate,
        hoursPending,
        totalHrs,
        isEscalated: ts.isEscalated,
      };
    }).sort((a, b) => b.hoursPending - a.hoursPending); // Age descending
  }, [db.timesheets, db.employees, db.lines]);

  // --- REPORT 4: HOLIDAY WORK EXCEPTIONS ---
  const holidayExceptionsReport = useMemo(() => {
    const exceptions: { date: string; employeeName: string; project: string; hours: number; comment: string; holidayName: string }[] = [];

    // Check all approved timesheets
    db.timesheets.filter(t => t.status === 'Approved').forEach(ts => {
      const emp = db.employees.find(e => e.id === ts.employeeId);
      if (!emp) return;

      const dates = getWeekDates(ts.weekStartDate);
      const tsLines = db.lines.filter(l => l.timesheetId === ts.id);

      tsLines.forEach(line => {
        const proj = db.projects.find(p => p.id === line.projectId);
        line.hours.forEach((hrs, idx) => {
          if (hrs > 0) {
            const dateStr = dates[idx];
            const holiday = db.holidays.find(h => h.date === dateStr && (h.region === emp.region || h.region === 'Global'));
            if (holiday) {
              exceptions.push({
                date: dateStr,
                employeeName: emp.name,
                project: proj?.name || 'Unknown Project',
                hours: hrs,
                holidayName: holiday.name,
                comment: line.comments[idx] || '',
              });
            }
          }
        });
      });
    });

    return exceptions;
  }, [db.timesheets, db.lines, db.employees, db.projects, db.holidays]);

  // Combined totals
  const totalApprovedActualHours = useMemo(() => {
    return projectHoursReport.reduce((acc, p) => acc + p.actual, 0);
  }, [projectHoursReport]);

  const totalAssignedPlannedHours = useMemo(() => {
    return projectHoursReport.reduce((acc, p) => acc + p.planned, 0);
  }, [projectHoursReport]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Power BI Styled Header */}
      <div className="glass-panel" style={{ padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid #f2c811', background: 'rgba(242, 200, 17, 0.02)' }}>
        <div>
          <span style={{ fontSize: '0.65rem', color: '#f2c811', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Interactive Analytics Dashboard
          </span>
          <h2 style={{ fontSize: '1.4rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
            <TrendingUp size={20} style={{ color: '#f2c811' }} />
            Power BI: CimpleSoft Utilization & Hours Report
          </h2>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
          <div>Dataverse Connector Active • DirectQuery Mode</div>
          <div style={{ fontSize: '0.65rem', marginTop: '2.5px', color: 'var(--text-secondary)' }}>Report Viewer: <strong>{financeUser.name}</strong></div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        
        {/* KPI 1 */}
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(124,58,237,0.1)', borderRadius: '10px', color: 'var(--color-primary)' }}>
            <Briefcase size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total Approved actuals</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginTop: '2px' }}>
              {totalApprovedActualHours}h
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Planned Target: {totalAssignedPlannedHours}h</div>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(16,185,129,0.1)', borderRadius: '10px', color: 'var(--color-success)' }}>
            <Percent size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Avg. Consultant Util.</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginTop: '2px' }}>
              {utilizationReport.length > 0 
                ? Math.round(utilizationReport.reduce((acc,u) => acc + u.utilization, 0) / utilizationReport.length)
                : 0}%
            </div>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(14,165,233,0.1)', borderRadius: '10px', color: 'var(--color-info)' }}>
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Awaiting Approvals</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginTop: '2px' }}>
              {pendingApprovalsReport.length} sheets
            </div>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(245,158,11,0.1)', borderRadius: '10px', color: 'var(--color-warning)' }}>
            <AlertOctagon size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Holiday Work Entries</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginTop: '2px' }}>
              {holidayExceptionsReport.length} logged
            </div>
          </div>
        </div>

      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '20px' }}>
        
        {/* CHART 1: PROJECT ACTUALS VS PLANNED */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 size={16} style={{ color: '#f2c811' }} />
            Project Hours: Actual vs. Planned Comparison
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {projectHoursReport.map(proj => {
              const maxHour = Math.max(proj.planned, proj.actual, 10);
              const plannedPercent = (proj.planned / maxHour) * 100;
              const actualPercent = (proj.actual / maxHour) * 100;

              return (
                <div key={proj.name} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <strong>{proj.name}</strong>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      Actual: <strong style={{ color: 'var(--color-primary)' }}>{proj.actual}h</strong> / Planned: <strong>{proj.planned}h</strong>
                    </span>
                  </div>
                  
                  {/* Bar Widgets */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: '6px' }}>
                    {/* Actual Bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', width: '45px' }}>ACTUAL</span>
                      <div style={{ flex: 1, height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ 
                          width: `${actualPercent}%`, 
                          height: '100%', 
                          background: 'linear-gradient(90deg, var(--color-primary), #a855f7)', 
                          borderRadius: '4px',
                          boxShadow: proj.actual > proj.planned ? '0 0 8px rgba(124,58,237,0.3)' : 'none'
                        }} />
                      </div>
                    </div>
                    {/* Planned Bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', width: '45px' }}>PLANNED</span>
                      <div style={{ flex: 1, height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${plannedPercent}%`, height: '100%', background: '#4b5563', borderRadius: '4px' }} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Project Details Table */}
          <div style={{ marginTop: '24px', borderTop: '1px solid var(--glass-border)', paddingTop: '16px' }}>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>Resource Breakdown per Project (Approved actuals)</h4>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '6px 8px' }}>Project</th>
                    <th style={{ padding: '6px 8px' }}>Employee</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Logged Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {projectHoursReport.map(proj => {
                    const employeesList = Object.entries(proj.employees);
                    if (employeesList.length === 0) {
                      return (
                        <tr key={proj.name} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                          <td style={{ padding: '8px', fontWeight: 600 }}>{proj.name}</td>
                          <td colSpan={2} style={{ padding: '8px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No approved hours logged yet</td>
                        </tr>
                      );
                    }
                    return employeesList.map(([empName, hrs], idx) => (
                      <tr key={`${proj.name}_${empName}`} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                        <td style={{ padding: '8px', fontWeight: idx === 0 ? 600 : 400, color: idx === 0 ? '#fff' : 'var(--text-secondary)' }}>
                          {idx === 0 ? proj.name : ''}
                        </td>
                        <td style={{ padding: '8px' }}>{empName}</td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: 'var(--color-primary)' }}>{hrs}h</td>
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* CHART 2: CONSULTANT UTILIZATION GAUGE & BENCHMARK */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Percent size={16} style={{ color: '#f2c811' }} />
            Resource Utilization (Target: 80% Benchmark)
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Utilization is based on billable hours logged against the standard 40-hour work week target.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '10px' }}>
            {utilizationReport.map(c => {
              const meetsTarget = c.utilization >= 80;
              return (
                <div key={c.name} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <strong>{c.name}</strong>
                    <span>
                      Billable: <strong style={{ color: '#fff' }}>{c.billable}h</strong> | Util: <strong style={{ color: meetsTarget ? 'var(--color-success)' : 'var(--color-warning)' }}>{c.utilization}%</strong>
                    </span>
                  </div>

                  {/* Horizontal Bar with Target Line */}
                  <div style={{ position: 'relative', height: '20px', background: 'var(--bg-tertiary)', borderRadius: '6px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${Math.min(c.utilization, 100)}%`, 
                      height: '100%', 
                      background: meetsTarget ? 'var(--color-success)' : 'var(--color-warning)', 
                      borderRadius: '6px',
                      transition: 'width 0.5s ease'
                    }} />
                    {/* 80% Target Line Marker */}
                    <div style={{
                      position: 'absolute',
                      left: '80%',
                      top: 0,
                      bottom: 0,
                      width: '2px',
                      borderLeft: '2px dashed #fff',
                      opacity: 0.7,
                    }} title="80% Target Benchmark" />
                    <span style={{
                      position: 'absolute',
                      left: '81%',
                      top: '2px',
                      fontSize: '0.55rem',
                      color: '#fff',
                      opacity: 0.6,
                      fontWeight: 700
                    }}>
                      80% TARGET
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="glass-panel" style={{
            background: 'rgba(255,255,255,0.01)',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
            marginTop: 'auto'
          }}>
            <strong>Finance / PMO Note:</strong> Only approved hours count toward billable utilization rates. Timesheets currently in submitted or draft stages are omitted from invoicing calculations.
          </div>
        </div>

      </div>

      {/* Bottom Grid: Pending Approvals & Holiday Exceptions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        
        {/* REPORT 3: PENDING APPROVALS AGING */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', color: '#fff', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={16} style={{ color: '#f2c811' }} />
            Submitted Timesheets - Approvals Aging
          </h3>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--glass-border)' }}>
                  <th style={{ padding: '8px' }}>Resource</th>
                  <th style={{ padding: '8px' }}>Week</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Total Hrs</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Aging (Hours)</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {pendingApprovalsReport.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      No timesheets currently pending manager approval.
                    </td>
                  </tr>
                ) : (
                  pendingApprovalsReport.map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                      <td style={{ padding: '10px 8px', fontWeight: 600, color: '#fff' }}>{item.employeeName}</td>
                      <td style={{ padding: '10px 8px' }}>{item.weekStartDate}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>{item.totalHrs}h</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: item.hoursPending >= 24 ? 'var(--color-danger)' : 'var(--color-info)' }}>
                        {item.hoursPending}h pending
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                        {item.isEscalated ? (
                          <span className="badge badge-rejected" style={{ fontSize: '0.6rem' }}>ESCALATED</span>
                        ) : (
                          <span className="badge badge-submitted" style={{ fontSize: '0.6rem' }}>Reviewing</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* REPORT 4: HOLIDAY EXCEPTIONS LOG */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', color: '#fff', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertOctagon size={16} style={{ color: '#f2c811' }} />
            Holiday Work Exceptions Audit Log
          </h3>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--glass-border)' }}>
                  <th style={{ padding: '8px' }}>Employee</th>
                  <th style={{ padding: '8px' }}>Date</th>
                  <th style={{ padding: '8px' }}>Holiday Name</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Hours</th>
                  <th style={{ padding: '8px' }}>Mandatory Comment</th>
                </tr>
              </thead>
              <tbody>
                {holidayExceptionsReport.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      No holiday exceptions logged in approved timesheets.
                    </td>
                  </tr>
                ) : (
                  holidayExceptionsReport.map((ex, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                      <td style={{ padding: '10px 8px', fontWeight: 600, color: '#fff' }}>{ex.employeeName}</td>
                      <td style={{ padding: '10px 8px' }}>{ex.date}</td>
                      <td style={{ padding: '10px 8px', color: 'var(--color-warning)' }}>{ex.holidayName}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700 }}>{ex.hours}h</td>
                      <td style={{ padding: '10px 8px', color: 'var(--text-secondary)', fontSize: '0.75rem', fontStyle: 'italic' }} title={ex.comment}>
                        {ex.comment.length > 30 ? `${ex.comment.substring(0, 27)}...` : ex.comment}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
};
