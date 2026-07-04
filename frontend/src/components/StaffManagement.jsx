import React, { useState, useEffect } from 'react';
import { ShieldCheck, Plus, Trash, User, CircleNotch, X, CheckCircle } from '@phosphor-icons/react';
import { fetchStaffRoles, createStaffRole, updateStaffRole, deleteStaffRole } from '../authStore';
import { motion, AnimatePresence } from 'framer-motion';

export default function StaffManagement() {
  const [staffList, setStaffList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('STAFF');
  const [permissions, setPermissions] = useState({
    canManageCatalog: true,
    canViewFinances: false,
    canProcessOrders: true
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadStaff = async () => {
    setIsLoading(true);
    const data = await fetchStaffRoles();
    setStaffList(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const handleAddStaff = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    if (!newStaffEmail.trim()) {
      setErrorMsg('Email is required');
      return;
    }
    const { ok, error } = await createStaffRole({
      email: newStaffEmail.trim(),
      role: newStaffRole,
      permissions
    });
    if (ok) {
      setSuccessMsg('Staff member added successfully.');
      setIsModalOpen(false);
      setNewStaffEmail('');
      loadStaff();
    } else {
      setErrorMsg(error || 'Failed to add staff');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this staff member?')) return;
    const { ok, error } = await deleteStaffRole(id);
    if (ok) {
      loadStaff();
    } else {
      alert(error || 'Failed to delete staff');
    }
  };

  const togglePermission = async (staffItem, permKey) => {
    const updatedPerms = { ...staffItem.permissions, [permKey]: !staffItem.permissions[permKey] };
    setStaffList(prev => prev.map(s => s._id === staffItem._id ? { ...s, permissions: updatedPerms } : s));
    await updateStaffRole(staffItem._id, { permissions: updatedPerms });
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-24">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl glass-panel p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 border-l-4 border-l-accent">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldCheck weight="duotone" className="w-6 h-6 text-accent" />
            Staff & Role Management
          </h1>
          <p className="text-muted-foreground text-sm max-w-xl leading-relaxed">
            Manage administrative access for team members. Super Admins can assign module-specific permissions.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg shadow-accent/20 shrink-0"
        >
          <Plus weight="bold" className="w-4 h-4" />
          Add Staff Member
        </button>
      </div>

      {/* Content */}
      <div className="bg-background/50 rounded-2xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <CircleNotch weight="bold" className="w-8 h-8 text-accent animate-spin" />
            <p className="mt-4 text-sm font-semibold text-muted-foreground">Loading staff records...</p>
          </div>
        ) : staffList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <User weight="duotone" className="w-12 h-12 text-slate-700 mb-4" />
            <h3 className="text-lg font-bold text-foreground">No staff members found</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-2">
              There are currently no staff records in the database.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-secondary/40 border-b border-border">
                  <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Email Account</th>
                  <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Role Level</th>
                  <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Permissions</th>
                  <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {staffList.map(staff => (
                  <tr key={staff._id} className="hover:bg-secondary/20 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-bold uppercase">
                          {staff.email.charAt(0)}
                        </div>
                        <span className="font-semibold text-sm">{staff.email}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                        staff.role === 'SUPERADMIN' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-brandBlue-500/10 text-brandBlue-400 border border-brandBlue-500/20'
                      }`}>
                        {staff.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        <PermissionToggle 
                          label="Catalog" 
                          active={staff.permissions?.canManageCatalog} 
                          onToggle={() => togglePermission(staff, 'canManageCatalog')} 
                        />
                        <PermissionToggle 
                          label="Finances" 
                          active={staff.permissions?.canViewFinances} 
                          onToggle={() => togglePermission(staff, 'canViewFinances')} 
                        />
                        <PermissionToggle 
                          label="Orders" 
                          active={staff.permissions?.canProcessOrders} 
                          onToggle={() => togglePermission(staff, 'canProcessOrders')} 
                        />
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDelete(staff._id)}
                        className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-colors border border-red-500/20"
                        title="Remove Staff"
                      >
                        <Trash weight="duotone" className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-background border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-5 border-b border-border bg-secondary/30">
                <h3 className="text-lg font-bold">Add New Staff</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground">
                  <X weight="bold" className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-5">
                {errorMsg && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-semibold">{errorMsg}</div>}
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Email Address</label>
                  <input
                    type="email"
                    value={newStaffEmail}
                    onChange={(e) => setNewStaffEmail(e.target.value)}
                    placeholder="staff@tarlactruckparts.com"
                    className="w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all text-sm font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Role</label>
                  <select
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all text-sm font-medium"
                  >
                    <option value="STAFF">Standard Staff</option>
                    <option value="SUPERADMIN">Super Admin</option>
                  </select>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Default Permissions</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${permissions.canManageCatalog ? 'bg-accent border-accent text-white' : 'border-border bg-secondary group-hover:border-slate-500'}`}>
                        {permissions.canManageCatalog && <CheckCircle weight="bold" className="w-3.5 h-3.5" />}
                      </div>
                      <span className="text-sm font-medium">Manage Catalog & Inventory</span>
                      <input type="checkbox" className="hidden" checked={permissions.canManageCatalog} onChange={() => setPermissions(p => ({ ...p, canManageCatalog: !p.canManageCatalog }))} />
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${permissions.canProcessOrders ? 'bg-accent border-accent text-white' : 'border-border bg-secondary group-hover:border-slate-500'}`}>
                        {permissions.canProcessOrders && <CheckCircle weight="bold" className="w-3.5 h-3.5" />}
                      </div>
                      <span className="text-sm font-medium">Process Orders & Quotes</span>
                      <input type="checkbox" className="hidden" checked={permissions.canProcessOrders} onChange={() => setPermissions(p => ({ ...p, canProcessOrders: !p.canProcessOrders }))} />
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${permissions.canViewFinances ? 'bg-accent border-accent text-white' : 'border-border bg-secondary group-hover:border-slate-500'}`}>
                        {permissions.canViewFinances && <CheckCircle weight="bold" className="w-3.5 h-3.5" />}
                      </div>
                      <span className="text-sm font-medium">View Financial Analytics</span>
                      <input type="checkbox" className="hidden" checked={permissions.canViewFinances} onChange={() => setPermissions(p => ({ ...p, canViewFinances: !p.canViewFinances }))} />
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="p-5 border-t border-border bg-secondary/30 flex justify-end gap-3">
                <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
                  Cancel
                </button>
                <button onClick={handleAddStaff} className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white text-sm font-semibold transition-all shadow-md">
                  Add Member
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const PermissionToggle = ({ label, active, onToggle }) => (
  <button
    onClick={onToggle}
    className={`px-2.5 py-1 rounded-md border text-2xs font-bold tracking-wide uppercase transition-colors ${
      active 
        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20' 
        : 'bg-secondary border-border text-muted-foreground hover:border-slate-500'
    }`}
  >
    {label}
  </button>
);
