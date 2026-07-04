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
import { CaretDown, CaretUp } from '@phosphor-icons/react';

const API_BASE = import.meta.env.VITE_BACKEND_URL || '';
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
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted/60 border border-border/50">
      <span style={{ color }} className="text-2xs leading-none">{dot}</span>
      <span className="text-11px text-foreground/80 font-medium">{label}</span>
      {detail && (
        <span className="text-2xs text-muted-foreground border-l border-border/40 pl-1.5 ml-0.5">
          {detail}
        </span>
      )}
    </span>
  );
}

export default function StatusBar() {
  const isDev = import.meta.env.DEV;

  const [isExpanded, setIsExpanded] = useState(true);
  const [status, setStatus] = useState({
    firebase: 'ok',
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
    if (!isDev) return;
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

  if (!isDev) return null;

  if (!isExpanded) {
    return (
      <button 
        onClick={() => setIsExpanded(true)} 
        className="fixed bottom-0 right-0 p-1 px-2 bg-background/90 backdrop-blur-md border border-border/80 rounded-tl-lg text-muted-foreground hover:text-foreground z-[9999] shadow-sm flex items-center gap-1 text-2xs"
      >
        ⚙ System <CaretUp className="w-3 h-3" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 h-8 bg-background/90 backdrop-blur-md border-t border-border/80 flex items-center justify-between px-4 font-mono text-11px text-muted-foreground z-[9999] select-none" role="status" aria-label="System status">
      {/* Left: service chips */}
      <div className="flex items-center gap-3">
        <span className="text-2xs uppercase tracking-widest text-muted-foreground/80 font-bold mr-1">⚙ System</span>
        <Chip label="Frontend" state="ok" />
        <Chip label="Firebase" state={status.firebase} />
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
          <span className="text-2xs text-red-500 font-bold" title={status.error}>⚠ {status.error}</span>
        )}
        {status.lastChecked && (
          <span className="text-2xs text-muted-foreground/70">Last checked {status.lastChecked}</span>
        )}
        <button
          className="bg-transparent border-none text-muted-foreground/60 hover:text-foreground transition-colors cursor-pointer text-sm leading-none px-1"
          onClick={check}
          title="Re-check status now"
          aria-label="Refresh status"
        >
          ↻
        </button>
        <div className="w-px h-3 bg-border/80 mx-1"></div>
        <button 
          onClick={() => setIsExpanded(false)}
          className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded hover:bg-secondary"
          title="Hide status bar"
        >
          <CaretDown className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
