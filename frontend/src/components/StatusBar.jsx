/**
 * StatusBar.jsx
 *
 * Industry-standard dev/ops status indicator bar.
 * Polls /api/health every 30s and shows live status for:
 *   • Frontend (always "ok" if this renders)
 *   • Backend API reachability
 *   • MongoDB connection state (from backend health endpoint)
 *
 * Only visible in development mode (import.meta.env.DEV).
 * Place at the bottom of App.jsx to get a sticky footer.
 */

import { useState, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const POLL_INTERVAL_MS = 30_000; // 30 seconds

const INDICATORS = {
  ok:          { color: '#22c55e', label: 'Operational',  dot: '●' },
  degraded:    { color: '#f59e0b', label: 'Degraded',     dot: '●' },
  unreachable: { color: '#ef4444', label: 'Unreachable',  dot: '●' },
  checking:    { color: '#94a3b8', label: 'Checking…',    dot: '◌' },
};

function Chip({ label, state, detail }) {
  const { color, dot } = INDICATORS[state] ?? INDICATORS.checking;

  return (
    <span style={styles.chip}>
      <span style={{ color, fontSize: '10px', lineHeight: 1 }}>{dot}</span>
      <span style={styles.chipLabel}>{label}</span>
      {detail && <span style={styles.chipDetail}>{detail}</span>}
    </span>
  );
}

export default function StatusBar() {
  // Only render in dev mode — remove this condition if you want it in prod too
  if (!import.meta.env.DEV) return null;

  const [status, setStatus] = useState({
    backend: 'checking',
    database: 'checking',
    uptime: null,
    lastChecked: null,
    error: null,
  });

  const check = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/health`, {
        signal: AbortSignal.timeout(5000),
      });
      const data = await res.json();

      setStatus({
        backend: data.services?.backend === 'ok' ? 'ok' : 'degraded',
        database: data.services?.database?.connected ? 'ok' : 'degraded',
        uptime: data.uptime,
        lastChecked: new Date().toLocaleTimeString(),
        error: null,
      });
    } catch {
      setStatus((prev) => ({
        ...prev,
        backend: 'unreachable',
        database: 'unreachable',
        lastChecked: new Date().toLocaleTimeString(),
        error: 'Could not reach backend',
      }));
    }
  }, []);

  useEffect(() => {
    check(); // immediate first check
    const id = setInterval(check, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [check]);

  const formatUptime = (s) => {
    if (!s) return null;
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
  };

  return (
    <div style={styles.bar} role="status" aria-label="System status">
      {/* Left: service chips */}
      <div style={styles.left}>
        <span style={styles.sysLabel}>⚙ System</span>
        <Chip label="Frontend" state="ok" />
        <Chip
          label="Backend API"
          state={status.backend}
          detail={status.uptime ? `up ${formatUptime(status.uptime)}` : undefined}
        />
        <Chip label="MongoDB" state={status.database} />
      </div>

      {/* Right: meta info */}
      <div style={styles.right}>
        {status.error && (
          <span style={styles.errorText} title={status.error}>⚠ {status.error}</span>
        )}
        {status.lastChecked && (
          <span style={styles.meta}>Last checked {status.lastChecked}</span>
        )}
        <button
          style={styles.refreshBtn}
          onClick={check}
          title="Re-check status now"
          aria-label="Refresh status"
        >
          ↻
        </button>
      </div>
    </div>
  );
}

// ── Inline styles (no external deps required) ─────────────────────────────────
const styles = {
  bar: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: '32px',
    background: 'rgba(15, 23, 42, 0.92)',
    backdropFilter: 'blur(8px)',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
    fontSize: '11px',
    color: '#94a3b8',
    zIndex: 9999,
    userSelect: 'none',
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  sysLabel: {
    color: '#475569',
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginRight: '4px',
  },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '2px 8px',
    borderRadius: '4px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.07)',
  },
  chipLabel: {
    color: '#cbd5e1',
    fontSize: '11px',
  },
  chipDetail: {
    color: '#64748b',
    fontSize: '10px',
    borderLeft: '1px solid rgba(255,255,255,0.1)',
    paddingLeft: '6px',
    marginLeft: '2px',
  },
  meta: {
    color: '#475569',
    fontSize: '10px',
  },
  errorText: {
    color: '#f87171',
    fontSize: '10px',
  },
  refreshBtn: {
    background: 'none',
    border: 'none',
    color: '#475569',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '0 4px',
    lineHeight: 1,
    transition: 'color 0.2s',
  },
};
