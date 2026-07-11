import React, { useState, useEffect } from 'react';
import { User, EnvelopeSimple, Phone, ShieldCheck, CheckCircle, WarningCircle, CircleNotch, LockKey } from '@phosphor-icons/react';
import { updateProfile, verifyBeforeUpdateEmail, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../firebaseConfig';

export default function MyAccount({ user, onGoBack }) {
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

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setEmail(user.email || '');
      setPhoneNumber(user.phoneNumber || '');
      // Load extra profile data from localStorage or fallback to Firebase
      const localAvatar = localStorage.getItem(`avatar_${user.uid}`);
      setPhotoURL(localAvatar || user.photoURL || '');
      
      const localPhone = localStorage.getItem(`phone_${user.uid}`);
      setPhoneNumber(localPhone || user.phoneNumber || '');
    }
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
      const currentUser = auth.currentUser;
      
      // 1. Handle Profile Picture (Avoid Firebase URL limit)
      if (photoURL && photoURL.startsWith('data:image')) {
        localStorage.setItem(`avatar_${currentUser.uid}`, photoURL);
        // Dispatch custom event so the rest of the app can update the avatar
        window.dispatchEvent(new Event('avatarUpdated'));
      }

      // 2. Update Display Name and Local Storage fields
      if (displayName !== currentUser.displayName) {
        await updateProfile(currentUser, { displayName });
      }
      
      localStorage.setItem(`phone_${currentUser.uid}`, phoneNumber);

      // 2. Update Email (May require re-auth)
      const sanitizedEmail = email.trim();
      let emailVerificationSent = false;
      if (sanitizedEmail !== currentUser.email) {
        try {
          await verifyBeforeUpdateEmail(currentUser, sanitizedEmail);
          emailVerificationSent = true;
        } catch (emailErr) {
          if (emailErr.code === 'auth/requires-recent-login') {
            setPendingEmail(sanitizedEmail);
            setShowReauth(true);
            setIsLoading(false);
            return;
          } else {
            throw emailErr;
          }
        }
      }

      if (emailVerificationSent) {
        setSuccess('Profile updated! A verification link was sent to your new email to complete the change.');
      } else {
        setSuccess('Profile successfully updated! ✅');
      }
      setIsEditing(false);
      
      setTimeout(() => setSuccess(''), 4000);
      
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReauth = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const currentUser = auth.currentUser;
      const credential = EmailAuthProvider.credential(currentUser.email, password);
      
      await reauthenticateWithCredential(currentUser, credential);
      
      await verifyBeforeUpdateEmail(currentUser, pendingEmail);
      
      if (photoURL && photoURL.startsWith('data:image')) {
        localStorage.setItem(`avatar_${currentUser.uid}`, photoURL);
        window.dispatchEvent(new Event('avatarUpdated'));
      }
      
      if (displayName !== currentUser.displayName) {
        await updateProfile(currentUser, { displayName });
      }

      setSuccess('Profile updated! A verification link was sent to your new email to complete the change.');
      setIsEditing(false);
      setShowReauth(false);
      setPassword('');
      setPendingEmail('');
      setTimeout(() => setSuccess(''), 4000);

    } catch (err) {
      setError('Incorrect password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1024 * 1024 * 2) { // 2MB limit
        setError('Image must be less than 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoURL(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">My Account</h1>
          <p className="text-muted-foreground mt-1">Manage your personal information and security settings.</p>
        </div>
        {onGoBack && (
          <button 
            onClick={onGoBack}
            className="px-4 py-2 bg-secondary hover:bg-muted text-foreground font-semibold rounded-xl border border-border transition-colors"
          >
            Back to Dashboard
          </button>
        )}
      </div>

      {success && (
        <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-center gap-3 text-emerald-400 animate-fadeIn">
          <CheckCircle weight="duotone" className="w-5 h-5 shrink-0" />
          <p className="font-medium text-sm">{success}</p>
        </div>
      )}

      {error && !showReauth && (
        <div className="p-4 bg-red-500/15 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-400 animate-fadeIn">
          <WarningCircle weight="duotone" className="w-5 h-5 shrink-0" />
          <p className="font-medium text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Profile Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-background border border-border rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
            
            <div className="relative group">
              <div className="w-32 h-32 bg-accent/20 rounded-full flex items-center justify-center mb-4 border-4 border-background shadow-lg shadow-accent/10 overflow-hidden">
                {photoURL ? (
                  <img src={photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User weight="duotone" className="w-14 h-14 text-accent" />
                )}
              </div>
              
              {isEditing && (
                <label className="absolute bottom-4 right-0 p-2 bg-accent hover:bg-accent/90 text-white rounded-full cursor-pointer shadow-lg transition-transform hover:scale-110 active:scale-95">
                  <User weight="bold" className="w-4 h-4" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
              )}
            </div>

            <h2 className="text-xl font-bold text-foreground truncate w-full mt-2">{displayName || 'User'}</h2>
            <p className="text-sm text-muted-foreground truncate w-full">{email}</p>
            
            <div className="w-full mt-6 pt-6 border-t border-border flex items-center justify-center gap-2 text-xs font-semibold text-emerald-500">
              <ShieldCheck weight="duotone" className="w-4 h-4" />
              Account Verified
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <div className="md:col-span-2">
          <div className="bg-background border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border flex items-center justify-between bg-secondary/30">
              <h3 className="font-bold text-foreground">Profile Details</h3>
              {!isEditing && (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="text-sm font-semibold text-accent hover:text-accent/80 transition-colors"
                >
                  Edit Profile
                </button>
              )}
            </div>
            
            <div className="p-6">
              {showReauth ? (
                <form onSubmit={handleReauth} className="space-y-4 animate-fadeIn">
                  <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl text-orange-400 text-sm mb-4">
                    <p className="font-bold mb-1">Security Verification Required</p>
                    <p>To change your email address, please re-enter your password to confirm your identity.</p>
                  </div>
                  
                  {error && (
                    <div className="text-red-400 text-sm font-medium">{error}</div>
                  )}
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Current Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <LockKey className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-secondary border border-border rounded-xl text-foreground focus:outline-none focus:border-accent transition-colors"
                        required
                        autoFocus
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 pt-4">
                    <button
                      type="submit"
                      disabled={isLoading || !password}
                      className="flex-1 py-2 bg-accent hover:bg-accent/90 text-white font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isLoading ? <CircleNotch weight="bold" className="w-4 h-4 animate-spin" /> : 'Verify & Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowReauth(false);
                        setEmail(user?.email || '');
                        setPassword('');
                        setError('');
                      }}
                      className="flex-1 py-2 bg-secondary hover:bg-muted text-foreground font-semibold rounded-xl border border-border transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSave} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Display Name</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <User className={`w-4 h-4 ${isEditing ? 'text-accent' : 'text-muted-foreground'}`} />
                        </div>
                        <input
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          disabled={!isEditing}
                          className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-accent transition-colors disabled:bg-secondary disabled:text-muted-foreground disabled:opacity-70"
                          placeholder="Lionel Messi"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email Address</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <EnvelopeSimple className={`w-4 h-4 ${isEditing ? 'text-accent' : 'text-muted-foreground'}`} />
                        </div>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={!isEditing}
                          className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-accent transition-colors disabled:bg-secondary disabled:text-muted-foreground disabled:opacity-70"
                          placeholder="lionel.messi@example.com"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact Number</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Phone className={`w-4 h-4 ${isEditing ? 'text-accent' : 'text-muted-foreground'}`} />
                        </div>
                        <input
                          type="text"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          disabled={!isEditing}
                          className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-accent transition-colors disabled:bg-secondary disabled:text-muted-foreground disabled:opacity-70"
                          placeholder="+63 917 123 4567"
                        />
                      </div>
                    </div>
                  </div>

                  {isEditing && (
                    <div className="flex items-center gap-3 pt-4 border-t border-border mt-6">
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="px-6 py-2 bg-accent hover:bg-accent/90 text-white font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {isLoading ? <CircleNotch weight="bold" className="w-4 h-4 animate-spin" /> : 'Save Changes'}
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
                        className="px-6 py-2 bg-secondary hover:bg-muted text-foreground font-semibold rounded-xl border border-border transition-colors"
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
