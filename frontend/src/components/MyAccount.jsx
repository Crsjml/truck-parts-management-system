import React, { useState, useEffect } from 'react';
import { User, EnvelopeSimple, Phone, ShieldCheck, CheckCircle, WarningCircle, CircleNotch, LockKey, PencilSimple, SignOut, Buildings, X, UserCircle, IdentificationCard, ShoppingBag, BookmarkSimple } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { fetchCustomerProfile, updateCustomerProfile } from '../authStore';

// Shared input class
const INPUT_CLS = 'w-full pl-12 pr-4 py-3.5 bg-background border border-border rounded-2xl text-foreground focus:outline-none focus:border-accent transition-all disabled:bg-background/50 disabled:text-muted-foreground font-medium text-sm';

export default function MyAccount({ user, transactions = [], onGoBack }) {
  // Main State
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [photoURL, setPhotoURL] = useState('');

  // Draft State (for inline editing)
  const [draftName, setDraftName] = useState('');
  const [draftEmail, setDraftEmail] = useState('');
  const [draftPhone, setDraftPhone] = useState('');
  const [draftCompany, setDraftCompany] = useState('');

  // UI Edit States
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [editingCompany, setEditingCompany] = useState(false);

  // General UI States
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingProfile, setIsFetchingProfile] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Re-authentication state
  const [password, setPassword] = useState('');

  const [savedPartsCount, setSavedPartsCount] = useState(0);

  const loadProfile = async () => {
    if (user) {
      const profile = await fetchCustomerProfile();

      const loadedDisplayName = profile?.displayName || user.user_metadata?.full_name || '';
      const loadedEmail = user.email || '';
      const loadedPhoneNumber = profile?.phoneNumber || user.user_metadata?.contact_number || user.phone || '';
      const loadedPhotoURL = profile?.photoURL || user.user_metadata?.avatar_url || '';
      const loadedCompanyName = profile?.companyName || '';

      setDisplayName(loadedDisplayName);
      setEmail(loadedEmail);
      setPhoneNumber(loadedPhoneNumber);
      setPhotoURL(loadedPhotoURL);
      setCompanyName(loadedCompanyName);
      setSavedPartsCount(profile?.savedParts ? profile.savedParts.length : 0);

      setIsFetchingProfile(false);
    } else {
      setIsFetchingProfile(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [user]);

  // Section Handlers
  const handleEditPersonal = () => {
    setDraftName(displayName);
    setDraftEmail(email);
    setDraftPhone(phoneNumber);
    setEditingPersonal(true);
  };

  const handleCancelPersonal = () => {
    setEditingPersonal(false);
    setError('');
  };

  const handleEditCompany = () => {
    setDraftCompany(companyName);
    setEditingCompany(true);
  };

  const handleCancelCompany = () => {
    setEditingCompany(false);
    setError('');
  };

  const handleSavePersonal = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccess('');

    if (!draftName.trim()) {
      setError('Display name is required.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(draftEmail.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (draftPhone && !/^\+?[0-9]{10,14}$/.test(draftPhone.replace(/[\s-]/g, ''))) {
      setError('Please enter a valid phone number. (e.g. +639171234567)');
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      await updateCustomerProfile({
        displayName: draftName,
        phoneNumber: draftPhone,
        photoURL,
        companyName, // Keep existing
      });

      if (draftName !== currentUser.user_metadata?.full_name || draftPhone !== currentUser.user_metadata?.contact_number) {
        try {
          await supabase.auth.updateUser({
            data: { full_name: draftName, contact_number: draftPhone }
          });
        } catch (e) {
          console.warn('Non-critical: Supabase metadata update failed', e);
        }
      }

      const sanitizedEmail = draftEmail.trim();
      let emailVerificationSent = false;
      let emailFailedMessage = '';

      if (sanitizedEmail !== currentUser.email) {
        try {
          const { error: emailErr } = await supabase.auth.updateUser({ email: sanitizedEmail });
          if (emailErr) {
            emailFailedMessage = emailErr.message;
          } else {
            emailVerificationSent = true;
          }
        } catch (e) {
          emailFailedMessage = e.message;
        }
      }

      if (emailFailedMessage) {
        setError(emailFailedMessage);
      } else if (emailVerificationSent) {
        setSuccess('Profile updated! A verification link was sent to your new email.');
        setEditingPersonal(false);
        await loadProfile();
      } else {
        setSuccess('Personal details successfully updated.');
        setEditingPersonal(false);
        await loadProfile();
      }
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message || 'Failed to update personal details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCompany = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      await updateCustomerProfile({
        displayName, // Keep existing
        phoneNumber, // Keep existing
        photoURL,
        companyName: draftCompany,
      });

      setSuccess('Company details successfully updated.');
      setEditingCompany(false);
      await loadProfile();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message || 'Failed to update company details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please upload a valid image file.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 400;
          if (width > height) {
            if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
          } else {
            if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/webp', 0.7);
          
          setPhotoURL(compressedBase64);
          window.dispatchEvent(new Event('avatarUpdated'));
          
          // Auto-save just the photo
          try {
            await updateCustomerProfile({
              displayName,
              phoneNumber,
              photoURL: compressedBase64,
              companyName,
            });
            setSuccess('Profile photo updated.');
            setTimeout(() => setSuccess(''), 5000);
          } catch(err) {
            setError('Failed to update photo.');
          }
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReauth = async (e) => {
    e.preventDefault();
    // TODO: Implement Supabase re-authentication for sensitive operations
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      if (onGoBack) onGoBack();
      else window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const userTransactionsCount = transactions.filter(tx =>
    tx.customerName?.toLowerCase() === (user?.user_metadata?.full_name || user?.email || '').toLowerCase()
  ).length;

  if (!user) {
    return (
      <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn pb-24 px-4 sm:px-6">
        <div className="w-32 h-4 bg-secondary rounded animate-pulse" />
        <div className="w-48 h-8 bg-secondary rounded animate-pulse" />
        <div className="h-48 bg-secondary/30 rounded-[2.5rem] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn pb-24 px-4 sm:px-6">
      
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-muted-foreground font-display">Account Settings</p>
          <h1 className="mt-2 text-3xl font-display font-bold text-foreground flex items-center gap-3">
            My Profile
          </h1>
        </div>
        {onGoBack && (
          <button
            onClick={onGoBack}
            className="px-4 py-2 bg-foreground text-background font-semibold rounded-xl transition-all hover:scale-[1.02] shadow-md"
          >
            Back to Dashboard
          </button>
        )}
      </div>

      <AnimatePresence>
        {(success || error) && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={`fixed bottom-6 right-6 z-50 flex items-start gap-3 p-4 rounded-2xl border shadow-2xl backdrop-blur-xl max-w-sm w-[calc(100vw-3rem)] ${
              success
                ? 'bg-emerald-950/80 border-emerald-500/20 text-emerald-400 shadow-emerald-500/10'
                : 'bg-red-950/80 border-red-500/20 text-red-400 shadow-red-500/10'
            }`}
          >
            {success ? (
              <CheckCircle weight="fill" className="w-5 h-5 shrink-0 mt-0.5 text-emerald-500" />
            ) : (
              <WarningCircle weight="fill" className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
            )}
            <div className="flex-1 pr-2">
              <h4 className={`text-sm font-bold ${success ? 'text-emerald-300' : 'text-red-300'}`}>
                {success ? 'Success' : 'Error'}
              </h4>
              <p className={`text-xs mt-0.5 ${success ? 'text-emerald-400/80' : 'text-red-400/80'}`}>
                {success || error}
              </p>
            </div>
            <button
              onClick={() => { setSuccess(''); setError(''); }}
              className={`p-1.5 rounded-lg transition-colors ${
                success ? 'hover:bg-emerald-500/20 text-emerald-500/60 hover:text-emerald-400' : 'hover:bg-red-500/20 text-red-500/60 hover:text-red-400'
              }`}
            >
              <X weight="bold" className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Hero Card ── */}
      <div className="relative w-full bg-secondary/80 backdrop-blur-xl border border-border/50 rounded-[2.5rem] p-8 shadow-sm flex flex-col md:flex-row items-center md:items-start gap-8 transition-all duration-300 hover:shadow-xl hover:border-accent/30">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent rounded-[2.5rem] opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />
        
        {/* Avatar */}
        <div className="relative shrink-0 group">
          <div className="w-32 h-32 bg-background rounded-[2rem] flex items-center justify-center border-4 border-background shadow-xl overflow-hidden transition-transform duration-300 group-hover:scale-[1.02]">
            {isFetchingProfile ? (
              <div className="w-full h-full bg-secondary animate-pulse" />
            ) : photoURL ? (
              <img src={photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User weight="duotone" className="w-14 h-14 text-muted-foreground" />
            )}
          </div>
          <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-accent hover:bg-accent/90 text-white rounded-2xl flex items-center justify-center cursor-pointer shadow-lg transition-transform hover:scale-110 active:scale-95 border-[3px] border-secondary z-10">
            <PencilSimple weight="bold" className="w-4 h-4" />
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </label>
        </div>

        {/* Info */}
        <div className="flex-1 text-center md:text-left flex flex-col justify-center h-full pt-2">
          {isFetchingProfile ? (
            <div className="h-8 bg-secondary rounded animate-pulse w-48 mx-auto md:mx-0 mb-2" />
          ) : (
            <h2 className="text-3xl font-bold text-foreground mb-1">{displayName || 'Complete Your Profile'}</h2>
          )}
          
          {isFetchingProfile ? (
            <div className="h-4 bg-secondary rounded animate-pulse w-32 mx-auto md:mx-0 mb-4" />
          ) : (
            <div className="text-muted-foreground space-y-1 mb-4">
              <p>{email}</p>
              <p>{phoneNumber || 'No phone number'}</p>
            </div>
          )}

          <div className="flex items-center justify-center md:justify-start gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg text-xs font-bold tracking-wider uppercase border border-emerald-500/20">
              <ShieldCheck weight="fill" className="w-4 h-4" />
              Verified Fleet Partner
            </div>
          </div>
        </div>

        {/* Stats & Actions */}
        <div className="flex flex-col items-center md:items-end gap-6 shrink-0 w-full md:w-auto">
          <button
            onClick={handleLogout}
            className="w-full md:w-auto flex justify-center items-center gap-2 px-4 py-2 bg-secondary/50 hover:bg-red-500/10 text-foreground hover:text-red-500 font-semibold rounded-xl border border-border hover:border-red-500/30 transition-all shadow-sm active:translate-y-[1px]"
          >
            <SignOut weight="bold" className="w-4 h-4" />
            Sign Out
          </button>
          
          <div className="flex gap-4 w-full md:w-auto">
            <div className="flex-1 md:flex-none flex items-center gap-3 bg-background/50 px-4 py-3 rounded-2xl border border-border/50">
              <div className="text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Orders</p>
                <p className="text-xl font-black text-foreground">{isFetchingProfile ? '-' : userTransactionsCount}</p>
              </div>
            </div>
            <div className="flex-1 md:flex-none flex items-center gap-3 bg-background/50 px-4 py-3 rounded-2xl border border-border/50">
              <div className="text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Saved</p>
                <p className="text-xl font-black text-foreground">{isFetchingProfile ? '-' : savedPartsCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bento Row (Personal + Company) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Personal Card */}
        <div className="lg:col-span-7 bg-secondary/80 backdrop-blur-xl border border-border/50 rounded-[2.5rem] shadow-sm flex flex-col overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-accent/30">
          <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between bg-background/30">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-accent/10 text-accent dark:bg-accent/20">
                <IdentificationCard weight="duotone" className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">Personal Details</h3>
            </div>
            {!editingPersonal && (
              <button onClick={handleEditPersonal} className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-background border border-border text-foreground font-bold text-xs rounded-xl hover:border-accent hover:text-accent transition-all shadow-sm active:translate-y-[1px]">
                <PencilSimple weight="bold" className="w-3.5 h-3.5" /> Edit
              </button>
            )}
          </div>
          <div className="p-6">
            <form onSubmit={handleSavePersonal} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="personal-name" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Full Name</label>
                {editingPersonal ? (
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User weight="duotone" className="w-5 h-5 text-accent" />
                    </div>
                    <input id="personal-name" type="text" value={draftName} onChange={e => setDraftName(e.target.value)} className={INPUT_CLS} autoFocus />
                  </div>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-background/50 border border-border/40 text-sm font-medium text-foreground">
                    <User weight="duotone" className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span>{displayName || '—'}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label htmlFor="personal-email" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Email Address</label>
                {editingPersonal ? (
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <EnvelopeSimple weight="duotone" className="w-5 h-5 text-accent" />
                    </div>
                    <input id="personal-email" type="email" value={draftEmail} onChange={e => setDraftEmail(e.target.value)} className={INPUT_CLS} />
                  </div>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-background/50 border border-border/40 text-sm font-medium text-foreground">
                    <EnvelopeSimple weight="duotone" className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span>{email || '—'}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label htmlFor="personal-phone" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Contact Number</label>
                {editingPersonal ? (
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Phone weight="duotone" className="w-5 h-5 text-accent" />
                    </div>
                    <input id="personal-phone" type="text" value={draftPhone} onChange={e => setDraftPhone(e.target.value)} className={INPUT_CLS} />
                  </div>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-background/50 border border-border/40 text-sm font-medium text-foreground">
                    <Phone weight="duotone" className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span>{phoneNumber || 'No phone number'}</span>
                  </div>
                )}
              </div>

              <AnimatePresence>
                {editingPersonal && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="pt-3 flex gap-3 overflow-hidden">
                    <button type="submit" disabled={isLoading} className="flex-1 py-2.5 bg-accent hover:bg-accent/90 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg active:translate-y-[1px] text-xs">
                      {isLoading ? <CircleNotch weight="bold" className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                    </button>
                    <button type="button" onClick={handleCancelPersonal} className="flex-1 py-2.5 bg-secondary hover:bg-muted text-foreground font-bold rounded-xl border border-border transition-all text-xs">
                      Cancel
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </div>
        </div>

        {/* Company Card */}
        <div className="lg:col-span-5 bg-secondary/80 backdrop-blur-xl border border-border/50 rounded-[2.5rem] shadow-sm flex flex-col overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-accent/30">
          <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between bg-background/30">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-accent/10 text-accent dark:bg-accent/20">
                <Buildings weight="duotone" className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">Company</h3>
            </div>
            {!editingCompany && (
              <button onClick={handleEditCompany} className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-background border border-border text-foreground font-bold text-xs rounded-xl hover:border-accent hover:text-accent transition-all shadow-sm active:translate-y-[1px]">
                <PencilSimple weight="bold" className="w-3.5 h-3.5" /> Edit
              </button>
            )}
          </div>
          <div className="p-6">
            <form onSubmit={handleSaveCompany} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="company-name" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Company Name</label>
                {editingCompany ? (
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Buildings weight="duotone" className="w-5 h-5 text-accent" />
                    </div>
                    <input id="company-name" type="text" value={draftCompany} onChange={e => setDraftCompany(e.target.value)} className={INPUT_CLS} autoFocus />
                  </div>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-background/50 border border-border/40 text-sm font-medium text-foreground">
                    <Buildings weight="duotone" className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span>{companyName || '— (No company assigned)'}</span>
                  </div>
                )}
              </div>

              <AnimatePresence>
                {editingCompany && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="pt-3 flex gap-3 overflow-hidden">
                    <button type="submit" disabled={isLoading} className="flex-1 py-2.5 bg-accent hover:bg-accent/90 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg active:translate-y-[1px] text-xs">
                      {isLoading ? <CircleNotch weight="bold" className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                    </button>
                    <button type="button" onClick={handleCancelCompany} className="flex-1 py-2.5 bg-secondary hover:bg-muted text-foreground font-bold rounded-xl border border-border transition-all text-xs">
                      Cancel
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </div>
        </div>
      </div>

      {/* ── Security Card ── */}
      <div className="w-full bg-secondary/80 backdrop-blur-xl border border-border/50 rounded-[2.5rem] shadow-sm flex flex-col overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-accent/30">
        <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between bg-background/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-accent/10 text-accent dark:bg-accent/20">
              <LockKey weight="duotone" className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-foreground">Security</h3>
          </div>
        </div>
        <div className="p-6">
          <form onSubmit={handleReauth} className="max-w-md space-y-4">
            <div className="space-y-1">
              <div className="w-full p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs">
                <div className="flex items-center gap-2 mb-1">
                  <LockKey weight="fill" className="w-4 h-4 shrink-0 text-amber-500" />
                  <p className="font-bold text-amber-600 dark:text-amber-400">Security Verification Required</p>
                </div>
                <p className="font-medium text-amber-600/80 dark:text-amber-400/80">Re-enter your current password before changing sensitive account details.</p>
              </div>
            </div>
            
            <div className="space-y-1">
              <label htmlFor="security-password" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Current Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <LockKey weight="regular" className="w-5 h-5 text-muted-foreground" />
                </div>
                <input id="security-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={INPUT_CLS} placeholder="Enter current password" />
              </div>
            </div>

            <div className="pt-1">
              <button type="button" className="w-full py-3 bg-accent/50 text-white font-bold rounded-xl cursor-not-allowed text-xs transition-all flex justify-center items-center gap-2" disabled aria-disabled="true">
                <LockKey weight="bold" className="w-4 h-4" />
                Verify & Continue
              </button>
            </div>
          </form>
        </div>
      </div>

    </div>
  );
}
