import { useState, useEffect, useCallback, useRef } from 'react';
import { CaretDown, CaretUp, Gear, ArrowsClockwise, Warning, CheckCircle } from '@phosphor-icons/react';

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

export default function StatusBar({ variant = 'bar', isLoggedIn = true }) {
  const isDev = import.meta.env.DEV;

  const [isExpanded, setIsExpanded] = useState(true);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const popoverRef = useRef(null);

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
    if (!isDev) return;
    check(); // immediate first check
    const id = setInterval(check, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [check, isDev]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setIsPopoverOpen(false);
      }
    };
    if (isPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPopoverOpen]);

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
  if (!isLoggedIn && variant === 'bar') return null;

  // Render Top Navbar Popover Mode for Admin Header
  if (variant === 'nav') {
    const isAllOk = status.backend === 'ok' && status.database === 'ok';
    const isUnreachable = status.backend === 'unreachable' || status.database === 'unreachable';

    return (
      <div className="relative" ref={popoverRef}>
        <button
          type="button"
          onClick={() => setIsPopoverOpen((v) => !v)}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary/60 hover:bg-secondary px-3 py-2 text-xs font-semibold text-foreground transition-all shadow-sm group"
          aria-label="System status"
          aria-expanded={isPopoverOpen}
        >
          <span className="relative flex h-2 w-2 shrink-0">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              isAllOk ? 'bg-emerald-400' : isUnreachable ? 'bg-red-400' : 'bg-amber-400'
            }`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${
              isAllOk ? 'bg-emerald-500' : isUnreachable ? 'bg-red-500' : 'bg-amber-500'
            }`} />
          </span>
          <span className="hidden sm:inline font-mono text-11px font-medium">
            {isAllOk ? 'System Operational' : isUnreachable ? 'System Unreachable' : 'Degraded State'}
          </span>
          <CaretDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${isPopoverOpen ? 'rotate-180' : ''}`} />
        </button>

        {isPopoverOpen && (
          <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-slate-200 dark:border-white/10 bg-background/95 backdrop-blur-2xl shadow-2xl p-4 z-50 animate-scaleUp text-foreground font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Gear weight="duotone" className="w-4 h-4 text-accent" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">System Services Health</h4>
              </div>
              <button
                type="button"
                onClick={check}
                className="p-1 rounded-lg border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                title="Refresh status now"
                aria-label="Refresh status"
              >
                <ArrowsClockwise weight="bold" className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2 py-3">
              <div className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg bg-secondary/40 border border-border/40">
                <span className="font-medium text-foreground">Frontend App</span>
                <Chip label="Operational" state="ok" />
              </div>
              <div className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg bg-secondary/40 border border-border/40">
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">Backend API</span>
                  {status.uptime && <span className="text-3xs text-muted-foreground">up {formatUptime(status.uptime)}</span>}
                </div>
                <Chip label={INDICATORS[status.backend]?.label || 'Checking'} state={status.backend} />
              </div>
              <div className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg bg-secondary/40 border border-border/40">
                <span className="font-medium text-foreground">Supabase (ap-south-1)</span>
                <Chip label={INDICATORS[status.database]?.label || 'Checking'} state={status.database} />
              </div>
            </div>

            {status.error && (
              <div className="mb-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-500 flex items-center gap-1.5">
                <Warning weight="bold" className="w-3.5 h-3.5 shrink-0" />
                <span>{status.error}</span>
              </div>
            )}

            <div className="pt-2 border-t border-border flex items-center justify-between text-3xs text-muted-foreground">
              <span>Auto-checks every 30s</span>
              {status.lastChecked && <span>Checked {status.lastChecked}</span>}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render Default Bottom Bar Mode
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
        <Chip
          label="Backend API"
          state={status.backend}
          detail={status.uptime ? `up ${formatUptime(status.uptime)}` : undefined}
        />
        <Chip label="Supabase (ap-south-1)" state={status.database} />
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
