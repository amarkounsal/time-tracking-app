import React, { useState } from 'react';
import { 
  Users, 
  Database, 
  Bell, 
  RotateCcw, 
  VolumeX, 
  Volume2,
  Lock
} from 'lucide-react';
import type { DataverseDatabase, Employee } from '../db';

interface ControllerProps {
  activePersona: Employee;
  employees: Employee[];
  onPersonaChange: (id: string) => void;
  db: DataverseDatabase;
  onResetDb: () => void;
  onRefreshDb: () => void;
  notificationCount: number;
  onMarkNotificationsRead: () => void;
}

export const Controller: React.FC<ControllerProps> = ({
  activePersona,
  employees,
  onPersonaChange,
  db,
  onResetDb,
  onRefreshDb,
  notificationCount,
  onMarkNotificationsRead,
}) => {
  const [dbDrawerOpen, setDbDrawerOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<keyof DataverseDatabase>('timesheets');
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Play micro-interaction sound
  const playClick = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1000, audioCtx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.02, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } catch (e) {
      // AudioContext blocked
    }
  };

  const handlePersonaSelect = (id: string) => {
    playClick();
    onPersonaChange(id);
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset the mock database? All custom entries will be lost.")) {
      playClick();
      onResetDb();
    }
  };

  return (
    <header className="glass-panel controller-header" style={{
      margin: '12px 12px 0 12px',
      padding: '12px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: '12px',
      zIndex: 500,
    }}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          background: 'linear-gradient(135deg, var(--color-primary), #a855f7)',
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--shadow-glow)',
        }}>
          <Database size={16} color="#fff" />
        </div>
        <div>
          <h1 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, background: 'linear-gradient(90deg, #fff, var(--text-secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            CimpleSoft TimeTracker
          </h1>
          <span style={{ fontSize: '0.65rem', color: 'var(--color-primary)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Power Platform / Dynamics 365 POC
          </span>
        </div>
      </div>

      {/* Center Channel Info Banner */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid var(--glass-border)',
        padding: '6px 14px',
        borderRadius: '8px',
        fontSize: '0.75rem',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <Lock size={12} style={{ color: 'var(--color-primary)' }} />
        <span>
          Channel Separation: <strong>{activePersona.role === 'Employee' ? 'Employee Entry Portal' : 'Dynamics 365 Back-Office App'}</strong>
        </span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', position: 'relative' }}>
        
        {/* Toggle Sound */}
        <button 
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="btn btn-secondary" 
          style={{ padding: '8px', borderRadius: '50%' }}
          title={soundEnabled ? "Mute audio cues" : "Unmute audio cues"}
        >
          {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} style={{ color: 'var(--text-muted)' }} />}
        </button>

        {/* Database Explorer Button */}
        <button 
          onClick={() => { playClick(); setDbDrawerOpen(!dbDrawerOpen); }}
          className="btn btn-secondary" 
          style={{ display: 'flex', gap: '6px', alignItems: 'center', border: dbDrawerOpen ? '1px solid var(--color-primary)' : '1px solid var(--glass-border)' }}
        >
          <Database size={16} style={{ color: dbDrawerOpen ? 'var(--color-primary)' : 'inherit' }} />
          <span style={{ fontSize: '0.8rem' }}>Dataverse Explorer</span>
          <span style={{
            background: 'var(--bg-tertiary)',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '0.7rem',
            color: 'var(--text-secondary)'
          }}>
            {Object.keys(db).length} tables
          </span>
        </button>

        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => { playClick(); setShowNotifMenu(!showNotifMenu); onMarkNotificationsRead(); }}
            className="btn btn-secondary"
            style={{ padding: '8px 12px', position: 'relative' }}
          >
            <Bell size={16} />
            {notificationCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: 'var(--color-danger)',
                color: '#fff',
                fontSize: '0.65rem',
                fontWeight: 700,
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 8px rgba(239, 68, 68, 0.5)'
              }}>
                {notificationCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifMenu && (
            <div className="glass-panel" style={{
              position: 'absolute',
              top: '46px',
              right: 0,
              width: '320px',
              maxHeight: '360px',
              overflowY: 'auto',
              zIndex: 600,
              padding: '12px',
              borderRadius: '8px',
              boxShadow: 'var(--shadow-lg)',
              animation: 'fadeIn var(--transition-fast)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Notification Log</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Simulating system mail alerts</span>
              </div>
              {db.notifications.filter(n => n.recipientId === activePersona.id).length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '20px 0' }}>
                  No notifications for {activePersona.name}
                </div>
              ) : (
                db.notifications
                  .filter(n => n.recipientId === activePersona.id)
                  .slice()
                  .reverse()
                  .map(n => (
                    <div key={n.id} style={{ 
                      padding: '8px', 
                      borderRadius: '6px', 
                      background: n.isRead ? 'transparent' : 'rgba(255, 255, 255, 0.02)',
                      borderLeft: n.isRead ? 'none' : '3px solid var(--color-primary)',
                      marginBottom: '6px',
                      fontSize: '0.8rem'
                    }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>{n.title}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', lineHeight: '1.2' }}>{n.message}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', marginTop: '4px' }}>
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))
              )}
            </div>
          )}
        </div>

        {/* Reset DB */}
        <button onClick={handleReset} className="btn btn-secondary" title="Reset mock database to initial seed data">
          <RotateCcw size={16} />
          <span style={{ fontSize: '0.8rem' }}>Reset DB</span>
        </button>

        {/* Persona Selector Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '4px 12px' }}>
          <Users size={16} style={{ color: 'var(--color-primary)' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 500 }}>Active Role</span>
            <select 
              value={activePersona.id}
              onChange={(e) => handlePersonaSelect(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-family)',
                fontSize: '0.85rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
                paddingRight: '12px',
              }}
            >
              {employees.map(emp => (
                <option key={emp.id} value={emp.id} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                  {emp.name} ({emp.role})
                </option>
              ))}
            </select>
          </div>
        </div>

      </div>

      {/* RELATIONAL DATABASE EXPLORER DRAWER */}
      {dbDrawerOpen && (
        <div className="glass-panel" style={{
          position: 'fixed',
          top: '78px',
          right: '12px',
          bottom: '12px',
          width: '460px',
          zIndex: 800,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-lg)',
          animation: 'slideInRight var(--transition-normal)',
          borderLeft: '1px solid var(--glass-border-hover)',
          overflow: 'hidden',
        }}>
          {/* Drawer Header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={18} style={{ color: 'var(--color-primary)' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Simulated Dataverse Database</h3>
            </div>
            <button 
              onClick={() => setDbDrawerOpen(false)}
              className="btn btn-secondary" 
              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            >
              Close
            </button>
          </div>

          {/* Drawer Tabs */}
          <div style={{
            display: 'flex',
            gap: '4px',
            padding: '8px 12px',
            background: 'rgba(255, 255, 255, 0.01)',
            borderBottom: '1px solid var(--glass-border)',
            overflowX: 'auto',
          }}>
            {(Object.keys(db) as Array<keyof DataverseDatabase>)
              .filter(k => k !== 'notifications') // hide notification system internals
              .map((tableName) => (
                <button
                  key={tableName}
                  onClick={() => setSelectedTable(tableName)}
                  style={{
                    background: selectedTable === tableName ? 'var(--color-primary)' : 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    color: selectedTable === tableName ? '#fff' : 'var(--text-secondary)',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  {tableName} ({db[tableName].length})
                </button>
            ))}
          </div>

          {/* Drawer Body - Table Records */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
                Table: Dataverse.{selectedTable}
              </span>
              <button 
                onClick={onRefreshDb}
                className="btn btn-secondary" 
                style={{ padding: '2px 8px', fontSize: '0.65rem', height: '22px' }}
              >
                Refresh Rows
              </button>
            </div>

            {db[selectedTable].length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                No rows in this table.
              </div>
            ) : (
              <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(255, 255, 255, 0.01)' }}>
                <table className="db-grid-table">
                  <thead>
                    <tr>
                      {Object.keys(db[selectedTable][0]).map(key => (
                        <th key={key}>{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {db[selectedTable].map((row: any, idx: number) => (
                      <tr key={row.id || idx}>
                        {Object.values(row).map((val: any, cellIdx: number) => {
                          let displayVal = '';
                          if (val === null) displayVal = 'null';
                          else if (Array.isArray(val)) displayVal = `[${val.join(', ')}]`;
                          else if (typeof val === 'object') displayVal = JSON.stringify(val);
                          else displayVal = String(val);

                          return (
                            <td 
                              key={cellIdx} 
                              style={{ 
                                maxWidth: '140px', 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis', 
                                whiteSpace: 'nowrap',
                                fontSize: '0.75rem' 
                              }}
                              title={displayVal}
                            >
                              {displayVal}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
