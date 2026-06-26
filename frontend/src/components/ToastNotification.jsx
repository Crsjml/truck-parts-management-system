import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, Info, X } from '@phosphor-icons/react';

// ── Individual Toast ───────────────────────────────────────────────────────────
function Toast({ id, type = 'success', message, onDismiss }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Animate in
    const enterTimer = setTimeout(() => setVisible(true), 10);
    // Auto-dismiss after 4s
    const exitTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(id), 350); // wait for exit anim
    }, 4000);
    return () => { clearTimeout(enterTimer); clearTimeout(exitTimer); };
  }, [id, onDismiss]);

  const config = {
    success: {
      icon: CheckCircle,
      bg: 'bg-emerald-950/90 border-emerald-700/50',
      icon_cls: 'text-emerald-400',
      text: 'text-emerald-100',
    },
    error: {
      icon: XCircle,
      bg: 'bg-red-950/90 border-red-700/50',
      icon_cls: 'text-red-400',
      text: 'text-red-100',
    },
    info: {
      icon: Info,
      bg: 'bg-blue-950/90 border-blue-700/50',
      icon_cls: 'text-blue-400',
      text: 'text-blue-100',
    },
  };

  const c = config[type] || config.success;
  const Icon = c.icon;

  return (
    <div
      className={`
        flex items-start gap-3 px-4 py-3.5 rounded-2xl border shadow-2xl backdrop-blur-xl
        min-w-[280px] max-w-[380px] pointer-events-auto
        transition-all duration-300 ease-out
        ${c.bg}
        ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}
      `}
    >
      <Icon weight="duotone" className={`w-5 h-5 shrink-0 mt-0.5 ${c.icon_cls}`} />
      <p className={`text-sm font-semibold leading-snug flex-1 ${c.text}`}>{message}</p>
      <button
        onClick={() => {
          setVisible(false);
          setTimeout(() => onDismiss(id), 350);
        }}
        className="shrink-0 text-white/40 hover:text-white/80 transition-colors mt-0.5"
        aria-label="Dismiss notification"
      >
        <X weight="bold" className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Toast Container (renders into portal at bottom-right) ─────────────────────
export default function ToastNotification({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return createPortal(
    <div
      className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2.5 pointer-events-none"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((t) => (
        <Toast key={t.id} {...t} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body
  );
}

// ── useToast hook ─────────────────────────────────────────────────────────────
export function useToast() {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return { toasts, showToast, dismissToast };
}
