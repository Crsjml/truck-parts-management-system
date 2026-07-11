import React, { useState, useEffect } from 'react';
import { User, EnvelopeSimple, Phone, ShieldCheck, CheckCircle, WarningCircle, CircleNotch, LockKey, PencilSimple, SignOut } from '@phosphor-icons/react';
import { supabase } from '../supabaseClient';
import { fetchCustomerProfile, updateCustomerProfile } from '../authStore';

export default function MyAccount({ user, transactions = [], onGoBack }) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  
  // Re-authentication state
  const [showReauth, setShowReauth] = useState(false);
  const [password, setPassword] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');

  const [savedPartsCount, setSavedPartsCount] = useState(0);

  useEffect(() => {
    async function loadProfile() {
      if (user) {
        setDisplayName(user.user_metadata?.full_name || '');
        setEmail(user.email || '');
        setPhoneNumber(user.phone || '');
        setPhotoURL(user.user_metadata?.avatar_url || '');

        const profile = await fetchCustomerProfile();
        if (profile) {
          if (profile.displayName) setDisplayName(profile.displayName);
          if (profile.phoneNumber) setPhoneNumber(profile.phoneNumber);
          if (profile.photoURL) setPhotoURL(profile.photoURL);
          setSavedPartsCount(profile.savedParts ? profile.savedParts.length : 0);
        }
      }
    }
    loadProfile();
  }, [user]);

  const validateForm = () => {
    if (!displayName.trim()) return 'Display name is required.';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) return 'Please enter a valid email address.';
    if (phoneNumber && !/^\+?[0-9]{10,14}$/.test(phoneNumber.replace(/[\s-]/g, ''))) {
      return 'Please enter a valid phone number. (e.g. +639171234567)';
    }
    return null;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (photoURL && photoURL.startsWith('data:image')) {
        window.dispatchEvent(new Event('avatarUpdated'));
      }

      // 1. Update backend profile first (handles the base64 photoURL without bloating JWT)
      await updateCustomerProfile({
        displayName,
        phoneNumber,
        photoURL
      });

      // 2. Update Supabase metadata (only full_name, NOT avatar_url)
      if (displayName !== currentUser.user_metadata?.full_name) {
        try {
          const { error: updateError } = await supabase.auth.updateUser({
            data: { full_name: displayName }
          });
          if (updateError) console.warn('Non-critical: Failed to sync full_name to Supabase Auth metadata', updateError);
        } catch (e) {
          console.warn('Non-critical: Supabase metadata update failed', e);
        }
      }

      // 3. Update Email (gracefully catch rate limits so they don't break the whole save)
      const sanitizedEmail = email.trim();
      let emailVerificationSent = false;
      let emailFailedMessage = '';

      if (sanitizedEmail !== currentUser.email) {
        try {
          const { error: emailErr } = await supabase.auth.updateUser({ email: sanitizedEmail });
          if (emailErr) {
            if (emailErr.status === 429 || emailErr.message?.toLowerCase().includes('rate limit')) {
              emailFailedMessage = 'Profile details saved, but email update failed due to rate limits. Please try again later.';
            } else {
              throw emailErr;
            }
          } else {
            emailVerificationSent = true;
          }
        } catch (e) {
          emailFailedMessage = `Profile details saved, but email update failed: ${e.message}`;
        }
      }

      if (emailFailedMessage) {
        setError(emailFailedMessage);
      } else if (emailVerificationSent) {
        setSuccess('Profile updated! A verification link was sent to your new email.');
      } else {
        setSuccess('Profile successfully updated! ✅');
      }
      setIsEditing(false);
      setTimeout(() => setSuccess(''), 5000);
      
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReauth = async (e) => {
    e.preventDefault();
    // Removed Firebase-specific reauth
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1024 * 1024 * 2) {
        setError('Image must be less than 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoURL(reader.result);
        setIsEditing(true); // Reveal the 'Save Changes' button
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const userTransactionsCount = transactions.filter(tx => 
    tx.customerName?.toLowerCase() === (user?.user_metadata?.full_name || user?.email || '').toLowerCase()
  ).length;

  if (!user) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn pb-24">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-3">
            <div className="w-32 h-4 bg-secondary rounded animate-pulse" />
            <div className="w-48 h-8 bg-secondary rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-6">
            <div className="rounded-[2.5rem] border border-border/50 bg-secondary/30 p-8 h-80 animate-pulse" />
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-[2rem] border border-border/50 bg-secondary/30 h-24 animate-pulse" />
              <div className="rounded-[2rem] border border-border/50 bg-secondary/30 h-24 animate-pulse" />
            </div>
          </div>
          <div className="lg:col-span-8">
            <div className="rounded-[2.5rem] border border-border/50 bg-secondary/30 h-[500px] animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn pb-24">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-muted-foreground font-display">Account Settings</p>
          <h1 className="mt-2 text-3xl font-display font-bold text-foreground flex items-center gap-3">
            My Profile
            <span className="inline-flex w-8 h-8 rounded-full bg-accent/10 items-center justify-center text-accent ring-4 ring-accent/5">
              <User weight="duotone" className="w-5 h-5" />
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-red-500/10 text-foreground hover:text-red-500 font-semibold rounded-xl border border-border hover:border-red-500/30 transition-all shadow-sm active:translate-y-[1px]"
          >
            <SignOut weight="bold" className="w-4 h-4" />
            Sign Out
          </button>
          {onGoBack && (
            <button 
              onClick={onGoBack}
              className="px-4 py-2 bg-foreground text-background font-semibold rounded-xl transition-all hover:scale-[1.02] shadow-md"
            >
              Back to Dashboard
            </button>
          )}
        </div>
      </div>

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-emerald-500 animate-fadeIn backdrop-blur-md">
          <CheckCircle weight="fill" className="w-5 h-5 shrink-0" />
          <p className="font-bold text-sm">{success}</p>
        </div>
      )}

      {error && !showReauth && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 animate-fadeIn backdrop-blur-md">
          <WarningCircle weight="fill" className="w-5 h-5 shrink-0" />
          <p className="font-bold text-sm">{error}</p>
        </div>
      )}

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Avatar & Quick Info */}
        <div className="lg:col-span-6 space-y-6 lg:sticky lg:top-8 h-fit">
          <div className="group relative rounded-[2.5rem] border border-border/50 bg-secondary/80 backdrop-blur-xl p-8 shadow-sm flex flex-col items-center text-center transition-all duration-500 ease-spring-physics hover:shadow-2xl hover:border-accent/50 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            
            <div className="relative">
              <div className="w-32 h-32 bg-background rounded-[2rem] flex items-center justify-center mb-5 border-4 border-background shadow-xl shadow-black/5 overflow-hidden transition-transform group-hover:scale-105">
                {photoURL ? (
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

            <h2 className="text-2xl font-bold text-foreground truncate w-full mt-3">
              {displayName ? displayName : <span className="text-muted-foreground italic text-lg">Complete Your Profile</span>}
            </h2>
            <p className="text-sm font-medium text-muted-foreground truncate w-full">{email}</p>
            
            <div className="w-full mt-6 pt-6 border-t border-border/50 flex items-center justify-center gap-2 text-[11px] font-bold tracking-wider uppercase text-emerald-500">
              <ShieldCheck weight="fill" className="w-4 h-4" />
              Verified Fleet Partner
            </div>
          </div>

          {/* Account Metrics (Decorative) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-[2rem] border border-border/50 bg-secondary/80 backdrop-blur-xl p-6 shadow-sm flex flex-col justify-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Orders</p>
              <p className="text-3xl font-black text-foreground font-display">{userTransactionsCount}</p>
            </div>
            <div className="rounded-[2rem] border border-border/50 bg-secondary/80 backdrop-blur-xl p-6 shadow-sm flex flex-col justify-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Saved Parts</p>
              <p className="text-3xl font-black text-foreground font-display">{savedPartsCount}</p>
            </div>
          </div>
        </div>

        {/* Right Column: Edit Form */}
        <div className="lg:col-span-6">
          <div className="rounded-[2.5rem] border border-border/50 bg-secondary/80 backdrop-blur-xl shadow-sm overflow-hidden flex flex-col h-full transition-all hover:shadow-xl hover:border-accent/30">
            <div className="p-8 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-background/30">
              <div>
                <h3 className="text-xl font-bold text-foreground">Personal Details</h3>
                <p className="text-sm font-medium text-muted-foreground mt-1">Update your contact information and preferences.</p>
              </div>
              {!isEditing && (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-background border border-border text-foreground font-bold text-sm rounded-xl hover:border-accent hover:text-accent transition-all shadow-sm active:translate-y-[1px]"
                >
                  <PencilSimple weight="bold" className="w-4 h-4" />
                  Edit Profile
                </button>
              )}
            </div>
            
            <div className="p-8 flex-1">
              {showReauth ? (
                <form onSubmit={handleReauth} className="max-w-md mx-auto space-y-6 animate-fadeIn">
                  <div className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-[1.5rem] text-amber-500 text-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <LockKey weight="fill" className="w-5 h-5" />
                      <p className="font-bold text-base">Security Verification</p>
                    </div>
                    <p className="font-medium">To change your email address, please re-enter your password to confirm your identity.</p>
                  </div>
                  
                  {error && (
                    <div className="text-red-500 text-sm font-bold text-center">{error}</div>
                  )}
                  
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Current Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <LockKey weight="duotone" className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-background border border-border rounded-2xl text-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all font-medium"
                        required
                        autoFocus
                      />
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-3 pt-4">
                    <button
                      type="submit"
                      disabled={isLoading || !password}
                      className="w-full sm:flex-1 py-3.5 bg-accent hover:bg-accent/90 text-white font-bold rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-accent/20"
                    >
                      {isLoading ? <CircleNotch weight="bold" className="w-5 h-5 animate-spin" /> : 'Verify & Continue'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowReauth(false);
                        setEmail(user?.email || '');
                        setPassword('');
                        setError('');
                      }}
                      className="w-full sm:flex-1 py-3.5 bg-background hover:bg-muted text-foreground font-bold rounded-2xl border border-border transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSave} className="space-y-8 max-w-2xl">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Full Name / Display Name</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <User weight={isEditing ? "duotone" : "regular"} className={`w-5 h-5 ${isEditing ? 'text-accent' : 'text-muted-foreground'}`} />
                        </div>
                        <input
                          type="text"
                          value={isEditing ? displayName : (displayName || "Not provided")}
                          onChange={(e) => setDisplayName(e.target.value)}
                          disabled={!isEditing}
                          className="w-full pl-12 pr-4 py-3.5 bg-background border border-border rounded-2xl text-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all disabled:bg-background/50 disabled:text-muted-foreground font-medium"
                          placeholder="Your full name"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Email Address</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <EnvelopeSimple weight={isEditing ? "duotone" : "regular"} className={`w-5 h-5 ${isEditing ? 'text-accent' : 'text-muted-foreground'}`} />
                        </div>
                        <input
                          type="email"
                          value={isEditing ? email : (email || "Not provided")}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={!isEditing}
                          className="w-full pl-12 pr-4 py-3.5 bg-background border border-border rounded-2xl text-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all disabled:bg-background/50 disabled:text-muted-foreground font-medium"
                          placeholder="juan@example.com"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Contact Number</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Phone weight={isEditing ? "duotone" : "regular"} className={`w-5 h-5 ${isEditing ? 'text-accent' : 'text-muted-foreground'}`} />
                        </div>
                        <input
                          type="text"
                          value={isEditing ? phoneNumber : (phoneNumber || "Not provided")}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          disabled={!isEditing}
                          className="w-full pl-12 pr-4 py-3.5 bg-background border border-border rounded-2xl text-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all disabled:bg-background/50 disabled:text-muted-foreground font-medium"
                          placeholder="+63 917 123 4567"
                        />
                      </div>
                    </div>
                  </div>

                  {isEditing && (
                    <div className="flex flex-col sm:flex-row items-center gap-3 pt-6 border-t border-border/50">
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full sm:w-auto px-8 py-3.5 bg-accent hover:bg-accent/90 text-white font-bold rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-accent/20 active:translate-y-[1px]"
                      >
                        {isLoading ? <CircleNotch weight="bold" className="w-5 h-5 animate-spin" /> : 'Save Changes'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(false);
                          setDisplayName(user?.displayName || '');
                          setEmail(user?.email || '');
                          setPhoneNumber(user?.phoneNumber || '');
                          setPhotoURL(user?.photoURL || '');
                          setError('');
                        }}
                        className="w-full sm:w-auto px-8 py-3.5 bg-background hover:bg-muted text-foreground font-bold rounded-2xl border border-border transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
