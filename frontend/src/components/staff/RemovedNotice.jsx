// frontend/src/components/staff/RemovedNotice.jsx
import { staffRoleLabel } from '../../utils/staffAccess';
import { restoreCaveats } from './removeCopy';

const BUTTON = 'px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors';

// Stays until dismissed or replaced: a timed-out Undo fails WCAG 2.2.1.
// Undo uses aria-disabled while restoring so focus stays on it.
export default function RemovedNotice({ notice, currentEmail, undoRef, onUndo, onDismiss }) {
  const label = staffRoleLabel(notice.role);
  const isRestored = notice.status === 'restored';
  const isRestoring = notice.status === 'restoring';
  const caveats = isRestored ? restoreCaveats(notice, currentEmail) : '';

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 px-6 py-3 border-b border-border bg-secondary/40 text-sm text-foreground"
    >
      <p className="mr-auto [overflow-wrap:anywhere]">
        {isRestored ? (
          <>
            <span className="font-semibold">Restored {notice.email} as {label}.</span>
            {caveats && <> {caveats}</>}
          </>
        ) : (
          <span className="font-semibold">Removed {notice.email} ({label}).</span>
        )}
      </p>
      {!isRestored && (
        <button
          ref={undoRef}
          type="button"
          aria-disabled={isRestoring}
          onClick={isRestoring ? undefined : onUndo}
          className={`${BUTTON} border border-border text-foreground hover:bg-secondary aria-disabled:opacity-40 aria-disabled:cursor-not-allowed`}
        >
          {isRestoring ? 'Restoring…' : 'Undo'}
        </button>
      )}
      <button
        type="button"
        onClick={onDismiss}
        className={`${BUTTON} text-muted-foreground hover:text-foreground`}
      >
        Dismiss
      </button>
    </div>
  );
}
