import { useState, useEffect, useCallback, useRef } from 'react';
import { useDialogFocus } from '../hooks/useDialogFocus';
import { createPortal } from 'react-dom';
import { ShieldCheck, Plus, User, CircleNotch, X, Lock, Warning } from '@phosphor-icons/react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { fetchStaffRoles, createStaffRole, updateStaffRole, deleteStaffRole } from '../authStore';
import StaffRoster from './staff/StaffRoster';
import StaffAddedPanel from './staff/StaffAddedPanel';
import { STAFF_ROLES } from '../utils/staffAccess';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function StaffManagement({ currentEmail }) {
  const [staffList, setStaffList] = useState([]);
  const [loadState, setLoadState] = useState('loading'); // loading | ready | denied | error
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('CASHIER');
  const [modalError, setModalError] = useState('');
  const [saving, setSaving] = useState(false);
  const [rosterError, setRosterError] = useState(null);
  const [pendingRemoveId, setPendingRemoveId] = useState(null);
  const [pendingRoleChange, setPendingRoleChange] = useState(null); // { id, to }
  const [roleNotice, setRoleNotice] = useState(null); // { id, email, from, to, isUndo }
  // { email, role, lastSeenAt, addedBy, status: 'removed' | 'restoring' | 'restored' }
  const [removedNotice, setRemovedNotice] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [addedStaff, setAddedStaff] = useState(null); // { email, role } after a successful add
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const keepEditingRef = useRef(null);
  const dialogRef = useRef(null);
  const reduceMotion = useReducedMotion();
  const dialogScale = reduceMotion ? 1 : 0.98;

  const emailInputRef = useRef(null);

  // Closing without adding drops the draft so a reopen never shows a stale email.
  const closeModal = () => {
    setIsModalOpen(false);
    setNewStaffEmail('');
    setNewStaffRole('CASHIER');
    setModalError('');
    setConfirmDiscard(false);
  };

  // Escape/✕/Cancel back out of the innermost step and never silently drop a
  // typed email: a second Escape dismisses the prompt, Discard closes.
  const keepEditing = () => {
    setConfirmDiscard(false);
    emailInputRef.current?.focus();
  };

  const requestCloseModal = () => {
    if (confirmDiscard) {
      keepEditing();
      return;
    }
    if (!addedStaff && newStaffEmail.trim()) {
      setConfirmDiscard(true);
      return;
    }
    closeModal();
  };

  useDialogFocus(dialogRef, { isOpen: isModalOpen, onClose: requestCloseModal, initialFocus: 'input' });

  useEffect(() => {
    if (confirmDiscard) keepEditingRef.current?.focus();
  }, [confirmDiscard]);

  // "Add another" swaps the success panel back for the form; put the caret in
  // the email field. Declared after useDialogFocus so that hook records the
  // opener before any focus moves.
  useEffect(() => {
    if (isModalOpen && !addedStaff) emailInputRef.current?.focus();
  }, [addedStaff, isModalOpen]);

  // silent: refresh after a change without swapping the roster for a spinner.
  const loadStaff = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoadState('loading');
    const { ok, status, staff } = await fetchStaffRoles();

    if (ok) {
      setStaffList(staff);
      setLoadState('ready');
    } else if (silent) {
      setRosterError('Saved, but the staff list could not be refreshed. Reload the page to see the latest.');
    } else if (status === 403) {
      setLoadState('denied');
    } else {
      setLoadState('error');
    }
  }, []);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const handleAddStaff = async (event) => {
    event?.preventDefault();
    if (saving) return;
    setModalError('');
    const email = newStaffEmail.trim();

    if (!email) {
      setModalError('Email is required.');
      return;
    }
    if (!EMAIL_PATTERN.test(email)) {
      setModalError('Enter a valid email address, e.g. name@tarlactruckparts.com.');
      return;
    }

    setSaving(true);
    const result = await createStaffRole({ email, role: newStaffRole });
    setSaving(false);

    if (result.ok) {
      setAddedStaff({ email, role: newStaffRole });
      setNewStaffEmail('');
      setNewStaffRole('CASHIER');
      loadStaff({ silent: true });
    } else {
      setModalError(result.error);
    }
  };

  // The select only stages a role; nothing is saved until Save is pressed.
  // Arrow keys on a closed <select> fire `change` on every step in some
  // browsers, so saving on change would write each step to the database.
  const handleChangeRole = (id, role) => {
    const person = staffList.find((p) => p.id === id);
    setPendingRemoveId(null);
    setRemovedNotice(null);
    setPendingRoleChange(person && role !== person.role ? { id, to: role } : null);
  };

  const saveRole = async (id, role, { isUndo = false } = {}) => {
    const person = staffList.find((p) => p.id === id);
    setRosterError(null);
    setRoleNotice(null);
    setRemovedNotice(null);
    setBusyId(id);
    const result = await updateStaffRole(id, role);
    setBusyId(null);
    setPendingRoleChange(null);

    // No optimistic update: the server can refuse (last-superadmin demote),
    // and a flipped-then-reverted control is worse than a brief wait.
    if (!result.ok) {
      setRosterError(result.error);
      return;
    }
    if (person) setRoleNotice({ id, email: person.email, from: person.role, to: role, isUndo });
    loadStaff({ silent: true });
  };

  const requestRemove = (id) => {
    setPendingRoleChange(null);
    setRemovedNotice(null);
    setPendingRemoveId(id);
  };

  const handleRemove = async (id) => {
    const person = staffList.find((p) => p.id === id);
    setRosterError(null);
    setBusyId(id);
    const result = await deleteStaffRole(id);
    setBusyId(null);
    setPendingRemoveId(null);

    if (!result.ok) {
      setRosterError(result.error);
      return;
    }
    if (person) {
      const { email, role, lastSeenAt, addedBy } = person;
      setRemovedNotice({ email, role, lastSeenAt, addedBy, status: 'removed' });
    }
    loadStaff({ silent: true });
  };

  // Undo re-adds the same email and role. The server treats it as a new entry,
  // so sign-in history and "added by" start over; the notice says so.
  const undoRemove = async () => {
    if (!removedNotice || removedNotice.status !== 'removed') return;
    const notice = removedNotice;
    setRosterError(null);
    setRemovedNotice({ ...notice, status: 'restoring' });
    const result = await createStaffRole({ email: notice.email, role: notice.role });

    if (!result.ok) {
      setRosterError(result.error);
      setRemovedNotice({ ...notice, status: 'removed' });
      return;
    }
    await loadStaff({ silent: true });
    setRemovedNotice({ ...notice, status: 'restored' });
  };

  return (
    <div className="space-y-6 motion-safe:animate-fadeIn pb-24">
      <div className="glass-panel !shadow-none rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldCheck weight="duotone" className="w-6 h-6 text-accent" />
            Staff Access
          </h2>
          <p className="text-foreground/70 text-sm max-w-xl leading-relaxed">
            Give each person the access they need. Cashiers handle sales and customers;
            warehouse staff manage stock and purchasing; admins see every operational page and
            sales analytics. Superadmins also manage staff and system settings.
          </p>
        </div>

        {loadState === 'ready' && (
          <button
            onClick={() => { setIsModalOpen(true); setModalError(''); setAddedStaff(null); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white font-semibold transition-colors shrink-0"
          >
            <Plus weight="bold" className="w-4 h-4" />
            Add Staff Member
          </button>
        )}
      </div>

      {loadState === 'loading' && (
        <div className="glass-panel !shadow-none rounded-xl flex flex-col items-center justify-center py-20">
          <CircleNotch weight="bold" className="w-8 h-8 text-accent animate-spin" />
          <p className="mt-4 text-sm font-semibold text-muted-foreground">Loading staff records…</p>
        </div>
      )}

      {loadState === 'denied' && (
        <div className="glass-panel !shadow-none rounded-xl flex flex-col items-center justify-center py-20 text-center px-6">
          <Lock weight="duotone" className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-bold text-foreground">Superadmin access required</h3>
          <p className="text-sm text-foreground/70 max-w-sm mt-2 leading-relaxed">
            Your account can view the shop but not the staff list. Ask a superadmin if you need access.
          </p>
        </div>
      )}

      {loadState === 'error' && (
        <div role="alert" className="glass-panel !shadow-none rounded-xl flex flex-col items-center justify-center py-20 text-center px-6">
          <Warning weight="duotone" className="w-12 h-12 text-alarm-text mb-4" />
          <h3 className="text-lg font-bold text-foreground">
            Could not reach the server
          </h3>
          <button
            onClick={() => loadStaff()}
            className="mt-4 px-5 py-2.5 rounded-xl bg-secondary hover:bg-muted border border-border text-sm font-semibold text-foreground transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {loadState === 'ready' && staffList.length === 0 && (
        <div className="glass-panel !shadow-none rounded-xl flex flex-col items-center justify-center py-20 text-center px-6">
          <User weight="duotone" className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-bold text-foreground">No staff members yet</h3>
          <p className="text-sm text-foreground/70 max-w-sm mt-2 leading-relaxed">
            Add an email address to give it staff access. That person registers on the storefront
            with that exact email and gains access on their first sign-in.
          </p>
        </div>
      )}

      {loadState === 'ready' && staffList.length > 0 && (
        <StaffRoster
          staff={staffList}
          currentEmail={currentEmail}
          onChangeRole={handleChangeRole}
          onRequestRemove={requestRemove}
          onCancelRemove={() => setPendingRemoveId(null)}
          onRemove={handleRemove}
          pendingRemoveId={pendingRemoveId}
          pendingRoleChange={pendingRoleChange}
          onConfirmRoleChange={(id, role) => saveRole(id, role)}
          onCancelRoleChange={() => setPendingRoleChange(null)}
          busyId={busyId}
          error={rosterError}
          roleNotice={roleNotice}
          onUndoRoleChange={() => saveRole(roleNotice.id, roleNotice.from, { isUndo: true })}
          onDismissRoleNotice={() => setRoleNotice(null)}
          superadminCount={staffList.filter((p) => p.role === 'SUPERADMIN').length}
          removedNotice={removedNotice}
          onUndoRemove={undoRemove}
          onDismissRemovedNotice={() => setRemovedNotice(null)}
        />
      )}

      {createPortal(<AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : undefined}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4 sm:p-6"
          >
            <motion.div
              initial={{ scale: dialogScale, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: dialogScale, opacity: 0 }}
              transition={reduceMotion ? { duration: 0 } : undefined}
              role="dialog"
              ref={dialogRef}
              aria-modal="true"
              aria-labelledby="add-staff-title"
              aria-describedby={addedStaff ? undefined : 'add-staff-description'}
              className="w-full max-w-md max-h-[calc(100dvh-2rem)] bg-background border border-border rounded-xl overflow-hidden flex flex-col"
            >
              <div className="flex shrink-0 items-center justify-between p-5 border-b border-border">
                <h2 id="add-staff-title" className="text-lg font-bold text-foreground">Add staff member</h2>
                <button
                  type="button"
                  onClick={requestCloseModal}
                  aria-label="Close"
                  className="p-1.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                >
                  <X weight="bold" className="w-5 h-5" />
                </button>
              </div>

              {addedStaff ? (
                <StaffAddedPanel
                  email={addedStaff.email}
                  role={addedStaff.role}
                  onAddAnother={() => setAddedStaff(null)}
                  onDone={closeModal}
                />
              ) : (
              <form onSubmit={handleAddStaff} noValidate className="flex min-h-0 flex-col">
              <div className="min-h-0 overflow-y-auto p-6 space-y-5">
                <p id="add-staff-description" className="text-sm text-muted-foreground leading-relaxed">
                  This gives an email address staff access — no invitation is sent. The person
                  registers on the storefront with this exact email, then signs in.
                  You’ll get the steps to share next.
                </p>

                {modalError && (
                  <p id="new-staff-email-error" role="alert" className="p-3 bg-destructive/10 border border-border text-alarm-text rounded-xl text-sm font-semibold">
                    {modalError}
                  </p>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="new-staff-email" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Email address
                  </label>
                  <input
                    id="new-staff-email"
                    type="email"
                    ref={emailInputRef}
                    aria-invalid={Boolean(modalError)}
                    aria-describedby={modalError ? 'new-staff-email-error' : undefined}
                    value={newStaffEmail}
                    onChange={(e) => { setNewStaffEmail(e.target.value); setModalError(''); }}
                    placeholder="name@tarlactruckparts.com"
                    className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-accent outline-none transition-colors text-sm font-medium text-foreground placeholder:text-muted-foreground"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="new-staff-role" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Role
                  </label>
                  <select
                    id="new-staff-role"
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:border-accent outline-none transition-colors text-sm font-medium text-foreground"
                  >
                    {STAFF_ROLES.map(role => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                    {STAFF_ROLES.find(role => role.value === newStaffRole)?.description}
                  </p>
                </div>
              </div>

              <div className="shrink-0 p-5 border-t border-border flex flex-wrap items-center justify-end gap-3 bg-secondary/30">
                {confirmDiscard ? (
                  <>
                    <p id="discard-email-question" role="alert" className="basis-full text-sm font-semibold text-foreground">
                      Discard the email you typed?
                    </p>
                    <button
                      ref={keepEditingRef}
                      type="button"
                      aria-describedby="discard-email-question"
                      onClick={keepEditing}
                      className="px-4 py-2 rounded-xl border border-border text-sm font-bold text-foreground hover:bg-secondary transition-colors"
                    >
                      Keep editing
                    </button>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-4 py-2 rounded-xl bg-alarm-solid hover:bg-alarm-solid/90 text-white text-sm font-bold transition-colors"
                    >
                      Discard
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={requestCloseModal}
                      className="px-5 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {saving ? 'Adding…' : 'Add member'}
                    </button>
                  </>
                )}
              </div>
              </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>, document.body)}
    </div>
  );
}
