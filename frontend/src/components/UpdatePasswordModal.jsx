import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { CircleNotch, CheckCircle, WarningCircle } from '@phosphor-icons/react';
import Logo from './Logo';

export default function UpdatePasswordModal({ onComplete }) {
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      onComplete(); // Successfully updated password
    } catch (err) {
      setError(err.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl bg-background border border-border p-8 shadow-2xl animate-scaleUp">
        <div className="flex flex-col items-center text-center space-y-4">
          <Logo className="w-16 h-16" showText={false} />
          
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Update Password</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Please enter your new password to complete the recovery process.
            </p>
          </div>

          {error && (
            <div className="w-full flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-500">
              <WarningCircle weight="duotone" className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleUpdate} className="w-full space-y-4 mt-4 text-left">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">New Password</label>
              <input
                type="password"
                className="w-full rounded-xl border border-border bg-background px-4 py-3.5 text-sm font-semibold text-foreground transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3.5 text-sm font-bold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? <CircleNotch weight="duotone" className="h-5 w-5 animate-spin" /> : <CheckCircle weight="duotone" className="h-5 w-5" />}
              Save New Password
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
