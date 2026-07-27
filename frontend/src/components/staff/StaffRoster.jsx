// frontend/src/components/staff/StaffRoster.jsx
import React from 'react';
import { Trash, Warning } from '@phosphor-icons/react';
import { staffState, relativeTime } from '../../utils/staffState';

// Colour is the only signal that varies per state, so it carries meaning
// rather than decoration. Muted pastel treatment per minimalist-ui §5.
const STATE_STYLE = {
  active: { dot: 'bg-emerald-500', label: 'Active' },
  invited: { dot: 'bg-amber-500', label: 'Invited' },
  dormant: { dot: 'bg-muted-foreground/50', label: 'Dormant' }
};

const ROLE_STYLE = {
  SUPERADMIN: 'bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/20',
  ADMIN: 'bg-brandBlue-500/10 text-brandBlue-600 dark:text-brandBlue-400 border-brandBlue-500/20'
};

export default function StaffRoster({
  staff,
  currentEmail,
  onChangeRole,
  onRequestRemove,
  onCancelRemove,
  onRemove,
  pendingRemoveId,
  busyId,
  error
}) {
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

      <ul className="divide-y divide-border">
        {staff.map((person) => {
          const state = staffState(person.lastSeenAt);
          const style = STATE_STYLE[state];
          const isSelf = person.email === currentEmail;
          const isPending = pendingRemoveId === person.id;
          const isBusy = busyId === person.id;

          if (isPending) {
            return (
              <li
                key={person.id}
                className="flex flex-wrap items-center justify-between gap-4 px-6 py-5 bg-red-500/5"
              >
                <p className="text-sm font-bold text-foreground">
                  Remove {person.email}? They lose admin access immediately.
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={onCancelRemove}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(person.id)}
                    disabled={isBusy}
                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-bold disabled:opacity-40 transition-colors"
                  >
                    {isBusy ? 'Removing…' : 'Remove'}
                  </button>
                </div>
              </li>
            );
          }

          return (
            <li
              key={person.id}
              className={`group flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-5 transition-colors hover:bg-secondary/40 ${
                person.role === 'SUPERADMIN' ? 'border-l-2 border-l-amber-500/40' : 'border-l-2 border-l-transparent'
              }`}
            >
              <span
                aria-hidden="true"
                className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`}
              />

              <div className="min-w-0 flex-1">
                <p className="text-base font-bold text-foreground truncate">{person.email}</p>
                <p className="text-xs text-muted-foreground truncate">
                  <span className="font-semibold">{style.label}</span>
                  {' · '}
                  {relativeTime(person.lastSeenAt)}
                  {' · added by '}
                  {person.addedBy}
                </p>
              </div>

              {isSelf ? (
                <span
                  className={`shrink-0 px-2.5 py-1 rounded-full border text-2xs font-bold uppercase tracking-wider ${ROLE_STYLE[person.role]}`}
                >
                  {person.role} · you
                </span>
              ) : (
                <>
                  <label htmlFor={`role-${person.id}`} className="sr-only">
                    Role for {person.email}
                  </label>
                  <select
                    id={`role-${person.id}`}
                    value={person.role}
                    disabled={isBusy}
                    onChange={(e) => onChangeRole(person.id, e.target.value)}
                    className="shrink-0 bg-secondary border border-border rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-foreground focus:outline-none focus:border-accent disabled:opacity-40 transition-colors"
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="SUPERADMIN">Superadmin</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => onRequestRemove(person.id)}
                    aria-label={`Remove ${person.email}`}
                    className="shrink-0 p-2 rounded-lg text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-red-500 transition-all"
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
