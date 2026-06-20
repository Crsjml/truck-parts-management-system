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
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-200/50 dark:bg-white/5 border border-slate-300/50 dark:border-white/10">
      <span style={{ color }} className="text-[10px] leading-none">{dot}</span>
      <span className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">{label}</span>
      {detail && (
        <span className="text-[10px] text-slate-500 dark:text-slate-400 border-l border-slate-300 dark:border-white/10 pl-1.5 ml-0.5">
          {detail}
        </span>
      )}
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
    <div className="fixed bottom-0 left-0 right-0 h-8 bg-slate-100/90 dark:bg-slate-900/92 backdrop-blur-md border-t border-slate-300/50 dark:border-white/5 flex items-center justify-between px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400 z-[9999] select-none" role="status" aria-label="System status">
      {/* Left: service chips */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold mr-1">⚙ System</span>
        <Chip label="Frontend" state="ok" />
        <Chip
          label="Backend API"
          state={status.backend}
          detail={status.uptime ? `up ${formatUptime(status.uptime)}` : undefined}
        />
        <Chip label="MongoDB" state={status.database} />
      </div>

      {/* Right: meta info */}
      <div className="flex items-center gap-2.5">
        {status.error && (
          <span className="text-[10px] text-red-500 font-bold" title={status.error}>⚠ {status.error}</span>
        )}
        {status.lastChecked && (
          <span className="text-[10px] text-slate-500 dark:text-slate-500">Last checked {status.lastChecked}</span>
        )}
        <button
          className="bg-transparent border-none text-slate-400 hover:text-foreground transition-colors cursor-pointer text-sm leading-none px-1"
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

