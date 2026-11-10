// frontend/src/components/staff/StaffAddedPanel.jsx
import { useEffect, useRef, useState } from 'react';
import { CheckCircle, Copy } from '@phosphor-icons/react';
import { staffRoleLabel } from '../../utils/staffAccess';

const COPY_RESET_MS = 2500;

// Nothing is emailed when a staff row is added, so the admin has to pass
// these steps on themselves. They mirror the real flow: storefront Register
// with the allowlisted address, confirm it, then sign in.
export function signInSteps(email, origin) {
  return [
    `Go to ${origin}`,
    `Click Register and create an account with exactly ${email}, then confirm it from your inbox.`,
    'Sign in with that account. You go straight to the staff app.'
  ];
}

export default function StaffAddedPanel({ email, role, onAddAnother, onDone }) {
  const headingRef = useRef(null);
  const [copyState, setCopyState] = useState('idle'); // idle | copied | failed
  const roleLabel = staffRoleLabel(role);
  const steps = signInSteps(email, window.location.origin);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  useEffect(() => {
    if (copyState === 'idle') return undefined;
    const timer = setTimeout(() => setCopyState('idle'), COPY_RESET_MS);
    return () => clearTimeout(timer);
  }, [copyState]);

  const handleCopy = async () => {
    const text = [
      `You have ${roleLabel} access to Tarlac Truck Pitstop.`,
      ...steps.map((step, i) => `${i + 1}. ${step}`)
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  };

  return (
    <div className="flex min-h-0 flex-col">
      <div className="min-h-0 overflow-y-auto p-6 space-y-5">
        <div className="flex items-start gap-3">
          <CheckCircle weight="fill" aria-hidden="true" className="w-6 h-6 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div className="space-y-1">
            <h3 ref={headingRef} tabIndex={-1} className="text-base font-bold text-foreground break-all focus:outline-none">
              {email} can now sign in
            </h3>
            <p className="text-sm text-muted-foreground">
              Added as {roleLabel}. No email was sent — share these steps with them.
            </p>
          </div>
        </div>

        <ol aria-label="Sign-in steps" className="space-y-2 text-sm text-foreground list-decimal pl-5 marker:font-bold marker:text-muted-foreground">
          {steps.map((step) => (
            <li key={step} className="leading-relaxed break-words">{step}</li>
          ))}
        </ol>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-secondary transition-colors"
          >
            <Copy weight="bold" aria-hidden="true" className="w-4 h-4" />
            {copyState === 'copied' ? 'Copied' : 'Copy sign-in steps'}
          </button>
          {copyState === 'failed' && (
            <p role="alert" className="text-xs font-semibold text-alarm-text">
              Couldn’t copy. Select the steps above instead.
            </p>
          )}
        </div>
      </div>

      <div className="shrink-0 p-5 border-t border-border flex justify-end gap-3 bg-secondary/30">
        <button
          type="button"
          onClick={onAddAnother}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          Add another
        </button>
        <button
          type="button"
          onClick={onDone}
          className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white text-sm font-semibold transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}
