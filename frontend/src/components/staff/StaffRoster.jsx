// frontend/src/components/staff/StaffRoster.jsx
import { useEffect, useRef } from 'react';
import { Trash, Warning } from '@phosphor-icons/react';
import { staffState, relativeTime } from '../../utils/staffState';
import { STAFF_ROLES, isPromotion, staffRoleLabel, accessDiff, formatList } from '../../utils/staffAccess';

const article = (label) => (/^[aeiou]/i.test(label) ? 'an' : 'a');

// "They lose A and B and gain C." Names every page that changes hands.
function accessChangeSentence(from, to) {
  const { gained, lost } = accessDiff(from, to);
  if (lost.length && gained.length) return ` They lose ${formatList(lost)} and gain ${formatList(gained)}.`;
  if (lost.length) return ` They lose ${formatList(lost)}.`;
  if (gained.length) return ` They gain ${formatList(gained)}.`;
  return '';
}

// What the inline Save/Cancel strip says, by kind of change. Every message
// names the pages gained or lost; promotions read "Make …", the rest "Change …".
function roleChangeCopy(email, from, to) {
  const toLabel = staffRoleLabel(to);
  const detail = accessChangeSentence(from, to);
  if (isPromotion(from, to)) {
    return { message: `Make ${email} ${article(toLabel)} ${toLabel}?${detail}`, action: `Make ${toLabel}` };
  }
  return {
    message: `Change ${email} from ${staffRoleLabel(from)} to ${toLabel}?${detail}`,
    action: from === 'SUPERADMIN' ? 'Change role' : 'Save'
  };
}

// A demotion narrows access, so its commit reads as destructive (Alarm Red);
// promotions and sideways moves commit with the Fleet Navy accent.
const isDemotion = (from, to) => isPromotion(to, from);

const CHANGE_TONE = {
  demotion: {
    row: 'bg-destructive/10 dark:bg-alarm-text/10',
    commit: 'bg-alarm-solid hover:bg-alarm-solid/90'
  },
  other: {
    row: 'bg-accent/5 dark:bg-accent/10',
    commit: 'bg-accent hover:bg-accent/90'
  }
};

const changeTone = (from, to) => CHANGE_TONE[isDemotion(from, to) ? 'demotion' : 'other'];

// Escape inside a row with a pending step backs out of that step, same as Cancel.
const cancelOnEscape = (onCancel) => (event) => {
  if (event.key !== 'Escape') return;
  event.preventDefault();
  onCancel();
};

// Colour is the only signal that varies per state, so it carries meaning
// rather than decoration. Muted pastel treatment per minimalist-ui §5.
const STATE_STYLE = {
  active: { dot: 'bg-emerald-500', label: 'Active' },
  pending: { dot: 'bg-amber-500', label: 'Not signed in yet' },
  dormant: { dot: 'bg-muted-foreground/50', label: 'Dormant' }
};

const ROLE_STYLE = {
  SUPERADMIN: 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-border',
  ADMIN: 'bg-brandBlue-500/10 text-brandBlue-700 dark:text-brandBlue-400 border-border',
  CASHIER: 'bg-secondary text-foreground border-border',
  WAREHOUSE: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-border'
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
  error,
  roleNotice,
  onUndoRoleChange,
  onDismissRoleNotice
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
        const kind = pendingRemoveId ? 'remove' : 'role';
        returnFocus.current = { id: pendingId, kind };
        // A staged role leaves focus on its select so arrow keys keep
        // stepping through options; Save/Cancel are the next Tab stops.
        if (kind === 'remove') cancelRef.current?.focus();
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
    <div className="glass-panel !shadow-none rounded-xl overflow-hidden">
      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 px-6 py-3 border-b border-border bg-destructive/5 text-sm font-semibold text-alarm-text"
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
                onKeyDown={isBusy ? undefined : cancelOnEscape(onCancelRemove)}
                className="flex flex-wrap items-center justify-between gap-4 px-6 py-5 bg-destructive/5"
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
                    className="px-4 py-2 rounded-lg bg-alarm-solid hover:bg-alarm-solid/90 text-white text-sm font-bold disabled:opacity-40 transition-colors"
                  >
                    {isBusy ? 'Removing…' : 'Remove'}
                  </button>
                </div>
              </li>
            );
          }

          const tone = roleChange ? changeTone(person.role, roleChange.to) : null;
          const rowTint = tone ? tone.row : 'hover:bg-secondary/40';
          const changeId = `role-change-${person.id}`;

          return (
            <li
              key={person.id}
              onKeyDown={roleChange && !isBusy ? cancelOnEscape(onCancelRoleChange) : undefined}
              className={`flex flex-wrap items-start sm:items-center gap-x-4 gap-y-3 sm:gap-y-2 px-6 py-5 transition-colors ${rowTint}`}
            >
              <span
                aria-hidden="true"
                className={`w-2 h-2 mt-2 sm:mt-0 rounded-full shrink-0 ${style.dot}`}
              />

              <div className="min-w-0 flex-[1_1_calc(100%-1.5rem)] sm:flex-1">
                <p className="text-base font-bold text-foreground [overflow-wrap:anywhere] sm:truncate">{person.email}</p>
                <p className="text-xs text-foreground/70 sm:truncate">
                  <span className="font-semibold">{style.label}</span>
                  {state !== 'pending' && <>{' · '}{relativeTime(person.lastSeenAt)}</>}
                  {' · added by '}
                  {person.addedBy}
                </p>
              </div>

              <div className="flex items-center gap-x-4 pl-6 sm:pl-0 shrink-0">
              {isSelf ? (
                <span
                  className={`shrink-0 px-2.5 py-1 rounded-md border text-xs font-bold uppercase tracking-wider ${ROLE_STYLE[person.role]}`}
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
                    value={roleChange?.to ?? person.role}
                    disabled={isBusy}
                    aria-describedby={roleChange ? changeId : undefined}
                    onChange={(e) => onChangeRole(person.id, e.target.value)}
                    className="shrink-0 min-h-11 sm:min-h-0 bg-secondary border border-border rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-foreground focus:outline-none focus:border-accent disabled:opacity-40 transition-colors"
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
                    className="shrink-0 min-h-11 min-w-11 sm:min-h-0 sm:min-w-0 inline-flex items-center justify-center p-2 rounded-lg text-muted-foreground hover:text-alarm-text transition-colors"
                  >
                    <Trash weight="bold" className="w-4 h-4" />
                  </button>
                </>
              )}
              </div>

              {roleChange && (
                <RoleChangeStrip
                  id={changeId}
                  copy={roleChangeCopy(person.email, person.role, roleChange.to)}
                  commitTone={tone.commit}
                  isBusy={isBusy}
                  cancelRef={cancelRef}
                  onCancel={onCancelRoleChange}
                  onConfirm={() => onConfirmRoleChange(person.id, roleChange.to)}
                />
              )}

              {!roleChange && roleNotice?.id === person.id && (
                // Stays until dismissed: a timed-out Undo fails WCAG 2.2.1.
                <div
                  role="status"
                  className="w-full flex flex-wrap items-center gap-x-3 gap-y-2 pl-6 text-sm text-foreground"
                >
                  <p className="mr-auto">
                    <span className="font-semibold">
                      {roleNotice.isUndo ? 'Role changed back to' : 'Role changed to'} {staffRoleLabel(roleNotice.to)}
                    </span>{' '}
                    for {roleNotice.email}.
                  </p>
                  {!roleNotice.isUndo && (
                    <button
                      type="button"
                      onClick={onUndoRoleChange}
                      disabled={isBusy}
                      className="px-3 py-1.5 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-secondary disabled:opacity-40 transition-colors"
                    >
                      Undo
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onDismissRoleNotice}
                    className="px-3 py-1.5 rounded-lg text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Inline Save/Cancel for a staged role. The select only stages; this commits.
function RoleChangeStrip({ id, copy, commitTone, isBusy, cancelRef, onCancel, onConfirm }) {
  return (
    // Focus stays on the select, so the staged change is announced instead.
    <div aria-live="polite" className="w-full flex flex-wrap items-center gap-x-3 gap-y-2 pl-6">
      <p id={id} className="mr-auto text-sm font-bold text-foreground">
        {copy.message}
      </p>
      <button
        ref={cancelRef}
        type="button"
        onClick={onCancel}
        disabled={isBusy}
        className="px-4 py-2 rounded-lg text-sm font-semibold text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={isBusy}
        className={`px-4 py-2 rounded-lg ${commitTone} text-white text-sm font-bold disabled:opacity-40 transition-colors`}
      >
        {isBusy ? 'Saving…' : copy.action}
      </button>
    </div>
  );
}
