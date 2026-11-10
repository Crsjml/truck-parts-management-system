// frontend/src/components/staff/StaffRoster.jsx
import { useEffect, useRef } from 'react';
import { Trash, Warning } from '@phosphor-icons/react';
import { staffState, relativeTime } from '../../utils/staffState';
import { STAFF_ROLES, staffRoleLabel } from '../../utils/staffAccess';

// Colour is the only signal that varies per state, so it carries meaning
// rather than decoration. Muted pastel treatment per minimalist-ui §5.
const STATE_STYLE = {
  active: { dot: 'bg-emerald-500', label: 'Active' },
  pending: { dot: 'bg-amber-500', label: 'Not signed in yet' },
  dormant: { dot: 'bg-muted-foreground/50', label: 'Dormant' }
};

const ROLE_STYLE = {
  SUPERADMIN: 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30',
  ADMIN: 'bg-brandBlue-500/10 text-brandBlue-600 dark:text-brandBlue-400 border-brandBlue-500/20',
  CASHIER: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  WAREHOUSE: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20'
};

export default function StaffRoster({
  staff,
  currentEmail,
  onChangeRole,
  onRequestRemove,
  onCancelRemove,
  onRemove,
  pendingRemoveId,
  pendingRoleChange,
  onConfirmRoleChange,
  onCancelRoleChange,
  busyId,
  error
}) {
  const selfEmail = (currentEmail || '').toLowerCase();
  const listRef = useRef(null);
  const cancelRef = useRef(null);
  // Where focus goes once the inline confirmation closes:
  // { id, kind: 'role' | 'remove', removed?: boolean }
  const returnFocus = useRef(null);
  const pendingId = pendingRemoveId ?? pendingRoleChange?.id ?? null;

  useEffect(() => {
    if (pendingId) {
      if (returnFocus.current?.id !== pendingId) {
        returnFocus.current = { id: pendingId, kind: pendingRemoveId ? 'remove' : 'role' };
        cancelRef.current?.focus();
      }
      return;
    }
    const target = returnFocus.current;
    // The row's controls are disabled while it saves; wait until they're back.
    if (!target || busyId === target.id) return;
    returnFocus.current = null;
    // A confirmed removal takes the row away, so focus stays in the list
    // instead of falling back to <body>.
    const control = target.removed
      ? null
      : listRef.current?.querySelector(`[data-focus-return="${target.kind}-${target.id}"]`);
    (control || listRef.current)?.focus();
  }, [pendingId, pendingRemoveId, busyId]);

  const confirmRemove = (id) => {
    if (returnFocus.current) returnFocus.current = { ...returnFocus.current, removed: true };
    onRemove(id);
  };

  return (
    <div className="glass-panel rounded-2xl overflow-hidden">
      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 px-6 py-3 border-b border-border bg-red-500/5 text-sm font-semibold text-red-600 dark:text-red-400"
        >
          <Warning weight="fill" className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </p>
      )}

      <ul ref={listRef} tabIndex={-1} aria-label="Staff members" className="divide-y divide-border focus:outline-none">
        {staff.map((person) => {
          const state = staffState(person.lastSeenAt);
          const style = STATE_STYLE[state];
          const isSelf = person.email.toLowerCase() === selfEmail;
          const isPending = pendingRemoveId === person.id;
          const roleChange = pendingRoleChange?.id === person.id ? pendingRoleChange : null;
          const isBusy = busyId === person.id;

          if (isPending) {
            return (
              <li
                key={person.id}
                className="flex flex-wrap items-center justify-between gap-4 px-6 py-5 bg-red-500/5"
              >
                <p className="text-sm font-bold text-foreground">
                  Remove {person.email}? They lose access immediately.
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    ref={cancelRef}
                    type="button"
                    onClick={onCancelRemove}
                    disabled={isBusy}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => confirmRemove(person.id)}
                    disabled={isBusy}
                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-bold disabled:opacity-40 transition-colors"
                  >
                    {isBusy ? 'Removing…' : 'Remove'}
                  </button>
                </div>
              </li>
            );
          }

          if (roleChange) {
            const isPromotion = roleChange.to === 'SUPERADMIN';
            return (
              <li
                key={person.id}
                className="flex flex-wrap items-center justify-between gap-4 px-6 py-5 bg-amber-500/5"
              >
                <p className="text-sm font-bold text-foreground">
                  {isPromotion
                    ? `Make ${person.email} a Superadmin? They will be able to manage staff and system settings.`
                    : `Change ${person.email} from Superadmin to ${staffRoleLabel(roleChange.to)}? They lose access to staff and system settings.`}
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    ref={cancelRef}
                    type="button"
                    onClick={onCancelRoleChange}
                    disabled={isBusy}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => onConfirmRoleChange(person.id, roleChange.to)}
                    disabled={isBusy}
                    className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold disabled:opacity-40 transition-colors"
                  >
                    {isBusy ? 'Saving…' : isPromotion ? 'Make Superadmin' : 'Change role'}
                  </button>
                </div>
              </li>
            );
          }

          return (
            <li
              key={person.id}
              className="group flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-5 transition-colors hover:bg-secondary/40"
            >
              <span
                aria-hidden="true"
                className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`}
              />

              <div className="min-w-0 flex-1">
                <p className="text-base font-bold text-foreground truncate">{person.email}</p>
                <p className="text-xs text-muted-foreground truncate">
                  <span className="font-semibold">{style.label}</span>
                  {state !== 'pending' && <>{' · '}{relativeTime(person.lastSeenAt)}</>}
                  {' · added by '}
                  {person.addedBy}
                </p>
              </div>

              {isSelf ? (
                <span
                  className={`shrink-0 px-2.5 py-1 rounded-full border text-xs font-bold uppercase tracking-wider ${ROLE_STYLE[person.role]}`}
                >
                  {staffRoleLabel(person.role)} · you
                </span>
              ) : (
                <>
                  <label htmlFor={`role-${person.id}`} className="sr-only">
                    Role for {person.email}
                  </label>
                  <select
                    id={`role-${person.id}`}
                    data-focus-return={`role-${person.id}`}
                    value={person.role}
                    disabled={isBusy}
                    onChange={(e) => onChangeRole(person.id, e.target.value)}
                    className="shrink-0 bg-secondary border border-border rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-foreground focus:outline-none focus:border-accent disabled:opacity-40 transition-colors"
                  >
                    {STAFF_ROLES.map(role => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => onRequestRemove(person.id)}
                    data-focus-return={`remove-${person.id}`}
                    aria-label={`Remove ${person.email}`}
                    className="shrink-0 p-2 rounded-lg text-muted-foreground [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 focus-visible:opacity-100 hover:text-red-500 transition-all"
                  >
                    <Trash weight="bold" className="w-4 h-4" />
                  </button>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
