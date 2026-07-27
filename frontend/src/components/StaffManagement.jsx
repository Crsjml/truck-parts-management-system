import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, Plus, User, CircleNotch, X, Lock, Warning } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchStaffRoles, createStaffRole, updateStaffRole, deleteStaffRole } from '../authStore';
import StaffRoster from './staff/StaffRoster';

export default function StaffManagement({ currentEmail }) {
  const [staffList, setStaffList] = useState([]);
  const [loadState, setLoadState] = useState('loading'); // loading | ready | denied | error
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('ADMIN');
  const [modalError, setModalError] = useState('');
  const [saving, setSaving] = useState(false);
  const [rosterError, setRosterError] = useState(null);
  const [pendingRemoveId, setPendingRemoveId] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const loadStaff = useCallback(async () => {
    setLoadState('loading');
    const { ok, status, staff } = await fetchStaffRoles();

    if (ok) {
      setStaffList(staff);
      setLoadState('ready');
    } else if (status === 403) {
      setLoadState('denied');
    } else {
      setLoadState('error');
    }
  }, []);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const handleAddStaff = async () => {
    setModalError('');
    const email = newStaffEmail.trim();

    if (!email) {
      setModalError('Email is required.');
      return;
    }

    setSaving(true);
    const result = await createStaffRole({ email, role: newStaffRole });
    setSaving(false);

    if (result.ok) {
      setIsModalOpen(false);
      setNewStaffEmail('');
      setNewStaffRole('ADMIN');
      loadStaff();
    } else {
      setModalError(result.error);
    }
  };

  const handleChangeRole = async (id, role) => {
    setRosterError(null);
    setBusyId(id);
    const result = await updateStaffRole(id, role);
    setBusyId(null);

    // No optimistic update: the server can refuse (last-superadmin demote),
    // and a flipped-then-reverted control is worse than a brief wait.
    if (result.ok) loadStaff();
    else setRosterError(result.error);
  };

  const handleRemove = async (id) => {
    setRosterError(null);
    setBusyId(id);
    const result = await deleteStaffRole(id);
    setBusyId(null);
    setPendingRemoveId(null);

    if (result.ok) loadStaff();
    else setRosterError(result.error);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-24">
      <div className="glass-panel rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 border-l-2 border-l-accent">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldCheck weight="duotone" className="w-6 h-6 text-accent" />
            Staff Access
          </h1>
          <p className="text-muted-foreground text-sm max-w-xl leading-relaxed">
            Admins run inventory, purchasing and the counter. Superadmins additionally manage
            these accounts and system settings.
          </p>
        </div>

        {loadState === 'ready' && (
          <button
            onClick={() => { setIsModalOpen(true); setModalError(''); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white font-semibold transition-colors shrink-0"
          >
            <Plus weight="bold" className="w-4 h-4" />
            Add Staff Member
          </button>
        )}
      </div>

      {loadState === 'loading' && (
        <div className="glass-panel rounded-2xl flex flex-col items-center justify-center py-20">
          <CircleNotch weight="bold" className="w-8 h-8 text-accent animate-spin" />
          <p className="mt-4 text-sm font-semibold text-muted-foreground">Loading staff records…</p>
        </div>
      )}

      {loadState === 'denied' && (
        <div className="glass-panel rounded-2xl flex flex-col items-center justify-center py-20 text-center px-6">
          <Lock weight="duotone" className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-bold text-foreground">Superadmin access required</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-2 leading-relaxed">
            Your account can view the shop but not the staff list. Ask a superadmin if you need access.
          </p>
        </div>
      )}

      {loadState === 'error' && (
        <div className="glass-panel rounded-2xl flex flex-col items-center justify-center py-20 text-center px-6">
          <Warning weight="duotone" className="w-12 h-12 text-red-500 mb-4" />
          <h3 role="alert" className="text-lg font-bold text-foreground">
            Could not reach the server
          </h3>
          <button
            onClick={loadStaff}
            className="mt-4 px-5 py-2.5 rounded-xl bg-secondary hover:bg-muted border border-border text-sm font-semibold text-foreground transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {loadState === 'ready' && staffList.length === 0 && (
        <div className="glass-panel rounded-2xl flex flex-col items-center justify-center py-20 text-center px-6">
          <User weight="duotone" className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-bold text-foreground">No staff members yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-2 leading-relaxed">
            Add an email address to allowlist it. That person then signs up normally and
            gains access on their first sign-in.
          </p>
        </div>
      )}

      {loadState === 'ready' && staffList.length > 0 && (
        <StaffRoster
          staff={staffList}
          currentEmail={currentEmail}
          onChangeRole={handleChangeRole}
          onRequestRemove={setPendingRemoveId}
          onCancelRemove={() => setPendingRemoveId(null)}
          onRemove={handleRemove}
          pendingRemoveId={pendingRemoveId}
          busyId={busyId}
          error={rosterError}
        />
      )}

      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-staff-title"
              className="w-full max-w-md bg-background border border-border rounded-2xl overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-5 border-b border-border">
                <h3 id="add-staff-title" className="text-lg font-bold text-foreground">Add staff member</h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  aria-label="Close"
                  className="p-1.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                >
                  <X weight="bold" className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  This allowlists an email address. The person signs up through the normal
                  flow and gains access on their first sign-in — no invitation is sent.
                </p>

                {modalError && (
                  <p role="alert" className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-semibold">
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
                    value={newStaffEmail}
                    onChange={(e) => { setNewStaffEmail(e.target.value); setModalError(''); }}
                    placeholder="name@tarlactruckparts.com"
                    className="w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:border-accent outline-none transition-colors text-sm font-medium text-foreground"
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
                    <option value="ADMIN">Admin — inventory, purchasing, counter</option>
                    <option value="SUPERADMIN">Superadmin — also staff and settings</option>
                  </select>
                </div>
              </div>

              <div className="p-5 border-t border-border flex justify-end gap-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddStaff}
                  disabled={saving || !newStaffEmail.trim()}
                  className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? 'Adding…' : 'Add member'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
