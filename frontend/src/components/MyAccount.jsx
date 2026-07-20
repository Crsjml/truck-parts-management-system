import React, { useState, useEffect } from 'react';
import { User, EnvelopeSimple, Phone, ShieldCheck, CheckCircle, WarningCircle, CircleNotch, LockKey, PencilSimple, SignOut, X, Buildings, MapPin, Plus, Trash, Star, MagnifyingGlass } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { fetchCustomerProfile, updateCustomerProfile } from '../authStore';
import { useNavigate } from 'react-router-dom';

export default function MyAccount({ user, transactions = [], onGoBack }) {
  const navigate = useNavigate();
  // Tabs
  const [activeTab, setActiveTab] = useState('personal'); // 'personal', 'company', 'security'

  // Form State
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [addresses, setAddresses] = useState([]);
  const [photoURL, setPhotoURL] = useState('');

  // Original Profile for Cancel
  const [originalProfile, setOriginalProfile] = useState(null);

  // UI State
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingProfile, setIsFetchingProfile] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Re-authentication state
  const [showReauth, setShowReauth] = useState(false);
  const [password, setPassword] = useState('');

  const [savedPartsCount, setSavedPartsCount] = useState(0);

  // Address Autocomplete
  const [addressQuery, setAddressQuery] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);

  const loadProfile = async () => {
    if (user) {
      const profile = await fetchCustomerProfile();
      
      const loadedDisplayName = profile?.displayName || user.user_metadata?.full_name || '';
      const loadedEmail = user.email || '';
      const loadedPhoneNumber = profile?.phoneNumber || user.phone || '';
      const loadedPhotoURL = profile?.photoURL || user.user_metadata?.avatar_url || '';
      const loadedCompanyName = profile?.companyName || '';
      const loadedAddresses = profile?.addresses || [];

      setDisplayName(loadedDisplayName);
      setEmail(loadedEmail);
      setPhoneNumber(loadedPhoneNumber);
      setPhotoURL(loadedPhotoURL);
      setCompanyName(loadedCompanyName);
      setAddresses(loadedAddresses);
      setSavedPartsCount(profile?.savedParts ? profile.savedParts.length : 0);

      setOriginalProfile({
        displayName: loadedDisplayName,
        email: loadedEmail,
        phoneNumber: loadedPhoneNumber,
        photoURL: loadedPhotoURL,
        companyName: loadedCompanyName,
        addresses: JSON.parse(JSON.stringify(loadedAddresses)) // deep copy
      });

      setIsFetchingProfile(false);
    } else {
      setIsFetchingProfile(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [user]);

  const validateForm = () => {
    if (activeTab === 'personal') {
      if (!displayName.trim()) return 'Display name is required.';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) return 'Please enter a valid email address.';
      if (phoneNumber && !/^\+?[0-9]{10,14}$/.test(phoneNumber.replace(/[\s-]/g, ''))) {
        return 'Please enter a valid phone number. (e.g. +639171234567)';
      }
    }
    return null;
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
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

      await updateCustomerProfile({
        displayName,
        phoneNumber,
        photoURL,
        companyName,
        addresses
      });

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

      const sanitizedEmail = email.trim();
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
      } else {
        setSuccess('Profile successfully updated.');
      }
      setIsEditing(false);
      await loadProfile(); 
      setTimeout(() => setSuccess(''), 5000);
      
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (originalProfile) {
      setDisplayName(originalProfile.displayName);
      setEmail(originalProfile.email);
      setPhoneNumber(originalProfile.phoneNumber);
      setPhotoURL(originalProfile.photoURL);
      setCompanyName(originalProfile.companyName);
      setAddresses(JSON.parse(JSON.stringify(originalProfile.addresses)));
    }
    setError('');
    setAddressQuery('');
    setAddressSuggestions([]);
  };

  const handleReauth = async (e) => {
    e.preventDefault();
    // TODO: Implement Supabase re-authentication for sensitive operations (e.g. email change)
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please upload a valid image file.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 400;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/webp', 0.7);
          setPhotoURL(compressedBase64);
          setIsEditing(true); 
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Address Autocomplete Logic
  const handleAddressSearch = (e) => {
    const query = e.target.value;
    setAddressQuery(query);
    
    if (searchTimeout) clearTimeout(searchTimeout);
    
    if (query.length < 4) {
      setAddressSuggestions([]);
      return;
    }
    
    setSearchTimeout(setTimeout(async () => {
      setIsSearchingAddress(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=ph&addressdetails=1&limit=5&accept-language=en,tl`);
        const data = await res.json();
        setAddressSuggestions(data);
      } catch (err) {
        console.error('OSM error:', err);
      } finally {
        setIsSearchingAddress(false);
      }
    }, 500));
  };

  const handleSelectAddress = (suggestion) => {
    setAddresses(prev => [...prev, {
      label: 'New Branch',
      fullAddress: suggestion.display_name,
      isDefaultShipping: prev.length === 0,
      isDefaultBilling: prev.length === 0,
    }]);
    setAddressQuery('');
    setAddressSuggestions([]);
    setIsEditing(true); // Dirty state
  };

  const updateAddress = (index, field, value) => {
    setAddresses(prev => {
      const next = [...prev];
      if (field === 'isDefaultShipping' && value === true) {
        next.forEach(a => a.isDefaultShipping = false);
      }
      if (field === 'isDefaultBilling' && value === true) {
        next.forEach(a => a.isDefaultBilling = false);
      }
      next[index][field] = value;
      return next;
    });
    setIsEditing(true);
  };

  const removeAddress = (index) => {
    setAddresses(prev => prev.filter((_, i) => i !== index));
    setIsEditing(true);
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Avatar & Quick Info */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8 h-fit">
          <div className="group relative rounded-[2.5rem] border border-border/50 bg-secondary/80 backdrop-blur-xl p-8 shadow-sm flex flex-col items-center text-center transition-all duration-500 ease-spring-physics hover:shadow-2xl hover:border-accent/50 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            
            <div className="relative">
              <div className="w-32 h-32 bg-background rounded-[2rem] flex items-center justify-center mb-5 border-4 border-background shadow-xl shadow-black/5 overflow-hidden transition-transform group-hover:scale-105">
                {isFetchingProfile ? (
                  <div className="w-full h-full bg-secondary animate-pulse" />
                ) : photoURL ? (
                  <img src={photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User weight="duotone" className="w-14 h-14 text-muted-foreground" />
                )}
              </div>
              
              <AnimatePresence>
                {isEditing && (
                  <motion.label 
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="absolute -bottom-2 -right-2 w-10 h-10 bg-accent hover:bg-accent/90 text-white rounded-2xl flex items-center justify-center cursor-pointer shadow-lg transition-transform hover:scale-110 active:scale-95 border-[3px] border-secondary z-10"
                  >
                    <PencilSimple weight="bold" className="w-4 h-4" />
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </motion.label>
                )}
              </AnimatePresence>
            </div>

            <h2 className="text-2xl font-bold text-foreground truncate w-full max-w-full px-2 mt-3">
              {isFetchingProfile ? (
                 <div className="h-8 bg-secondary rounded animate-pulse w-3/4 mx-auto" />
              ) : displayName ? displayName : <span className="text-muted-foreground italic text-lg">Complete Your Profile</span>}
            </h2>
            {isFetchingProfile ? (
               <div className="h-4 bg-secondary rounded animate-pulse w-1/2 mx-auto mt-2" />
            ) : (
               <p className="text-sm font-medium text-muted-foreground truncate w-full max-w-full px-2">{email}</p>
            )}
            
            <div className="w-full mt-6 pt-6 border-t border-border/50 flex items-center justify-center gap-2 text-[11px] font-bold tracking-wider uppercase text-emerald-500">
              <ShieldCheck weight="fill" className="w-4 h-4" />
              Verified Fleet Partner
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-[2rem] border border-border/50 bg-secondary/80 backdrop-blur-xl p-6 shadow-sm flex flex-col justify-center transition-all hover:scale-[1.02] hover:shadow-md hover:border-accent/30 cursor-default">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Orders</p>
              {isFetchingProfile ? <div className="h-8 w-12 bg-secondary rounded animate-pulse" /> : <p className="text-3xl font-black text-foreground font-display">{userTransactionsCount}</p>}
            </div>
            <div className="rounded-[2rem] border border-border/50 bg-secondary/80 backdrop-blur-xl p-6 shadow-sm flex flex-col justify-center transition-all hover:scale-[1.02] hover:shadow-md hover:border-brandBlue-500/30 cursor-default">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Saved Parts</p>
              {isFetchingProfile ? <div className="h-8 w-12 bg-secondary rounded animate-pulse" /> : <p className="text-3xl font-black text-foreground font-display">{savedPartsCount}</p>}
            </div>
          </div>
        </div>

        {/* Right Column: Edit Form & Tabs */}
        <div className="lg:col-span-8 flex flex-col min-h-0">
          
          <div className="flex overflow-x-auto hide-scrollbar gap-2 mb-6 bg-secondary/50 p-1.5 rounded-2xl border border-border/50 w-full shrink-0">
            {[
              { id: 'personal', label: 'Personal', icon: User },
              { id: 'company', label: 'Company & Address', icon: Buildings },
              { id: 'security', label: 'Security', icon: LockKey }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex justify-center items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-background text-foreground shadow-sm border border-border/50' 
                    : 'text-muted-foreground hover:text-foreground border border-transparent hover:bg-background/50'
                }`}
              >
                <tab.icon weight={activeTab === tab.id ? "fill" : "duotone"} className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="rounded-[2.5rem] border border-border/50 bg-secondary/80 backdrop-blur-xl shadow-sm overflow-hidden flex flex-col min-h-[600px] transition-all hover:shadow-xl hover:border-accent/30 relative">
            <div className="p-6 sm:p-8 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-background/30 shrink-0">
              <div>
                <h3 className="text-xl font-bold text-foreground">
                  {activeTab === 'personal' && 'Personal Details'}
                  {activeTab === 'company' && 'Company & Delivery'}
                  {activeTab === 'security' && 'Security & Password'}
                </h3>
                <p className="text-sm font-medium text-muted-foreground mt-1">
                  {activeTab === 'personal' && 'Update your contact information.'}
                  {activeTab === 'company' && 'Manage your B2B company name and multiple shipping locations.'}
                  {activeTab === 'security' && 'Change your password.'}
                </p>
              </div>
              {!isEditing && activeTab !== 'security' && (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-background border border-border text-foreground font-bold text-sm rounded-xl hover:border-accent hover:text-accent transition-all shadow-sm active:translate-y-[1px]"
                >
                  <PencilSimple weight="bold" className="w-4 h-4" />
                  Edit Profile
                </button>
              )}
            </div>
            
            <div className="p-6 sm:p-8 flex-1 overflow-y-auto custom-scrollbar">
              {activeTab === 'security' && (
                 <form onSubmit={handleReauth} className="max-w-md mx-auto space-y-6 animate-fadeIn">
                 <div className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-[1.5rem] text-amber-500 text-sm">
                   <div className="flex items-center gap-2 mb-2">
                     <LockKey weight="fill" className="w-5 h-5" />
                     <p className="font-bold text-base">Security Verification</p>
                   </div>
                   <p className="font-medium">To change your email address or password, please re-enter your password to confirm your identity.</p>
                 </div>
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
                       className="w-full pl-12 pr-4 py-3.5 bg-background border border-border rounded-2xl text-foreground focus:outline-none focus:border-accent transition-all font-medium"
                       required
                     />
                   </div>
                 </div>
                 <div className="pt-4">
                   <button type="button" className="w-full py-3.5 bg-accent text-white font-bold rounded-2xl shadow-lg opacity-50 cursor-not-allowed">
                     Verify & Continue
                   </button>
                 </div>
               </form>
              )}

              {activeTab === 'personal' && (
                <form id="personal-form" onSubmit={handleSave} className="space-y-6 max-w-xl animate-fadeIn">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Full Name / Display Name</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <User weight={isEditing ? "duotone" : "regular"} className={`w-5 h-5 ${isEditing ? 'text-accent' : 'text-muted-foreground'}`} />
                      </div>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => { setDisplayName(e.target.value); setIsEditing(true); }}
                        disabled={!isEditing}
                        className="w-full pl-12 pr-4 py-3.5 bg-background border border-border rounded-2xl text-foreground focus:outline-none focus:border-accent transition-all disabled:bg-background/50 disabled:text-muted-foreground font-medium text-base sm:text-sm"
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
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setIsEditing(true); }}
                        disabled={!isEditing}
                        className="w-full pl-12 pr-4 py-3.5 bg-background border border-border rounded-2xl text-foreground focus:outline-none focus:border-accent transition-all disabled:bg-background/50 disabled:text-muted-foreground font-medium text-base sm:text-sm"
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
                        value={phoneNumber}
                        onChange={(e) => { setPhoneNumber(e.target.value); setIsEditing(true); }}
                        disabled={!isEditing}
                        className="w-full pl-12 pr-4 py-3.5 bg-background border border-border rounded-2xl text-foreground focus:outline-none focus:border-accent transition-all disabled:bg-background/50 disabled:text-muted-foreground font-medium text-base sm:text-sm"
                        placeholder="+63 917 123 4567"
                      />
                    </div>
                  </div>
                </form>
              )}

              {activeTab === 'company' && (
                <form id="company-form" onSubmit={handleSave} className="space-y-8 animate-fadeIn max-w-2xl">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Company Name</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Buildings weight={isEditing ? "duotone" : "regular"} className={`w-5 h-5 ${isEditing ? 'text-accent' : 'text-muted-foreground'}`} />
                      </div>
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => { setCompanyName(e.target.value); setIsEditing(true); }}
                        disabled={!isEditing}
                        className="w-full pl-12 pr-4 py-3.5 bg-background border border-border rounded-2xl text-foreground focus:outline-none focus:border-accent transition-all disabled:bg-background/50 disabled:text-muted-foreground font-medium text-base sm:text-sm"
                        placeholder="Enter your company name (Optional)"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                       <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Saved Addresses</label>
                       {isEditing && (
                         <span className="text-[10px] text-accent uppercase font-bold tracking-widest bg-accent/10 px-2 py-1 rounded-md">Edit Mode</span>
                       )}
                    </div>
                    
                    {addresses.length === 0 && (
                      <div className="text-center p-8 border border-dashed border-border/60 rounded-2xl text-muted-foreground text-sm font-medium">
                        No addresses saved. Add one below.
                      </div>
                    )}

                    <div className="space-y-4">
                      {addresses.map((addr, i) => (
                        <div key={i} className="p-4 border border-border/80 bg-background/50 rounded-2xl relative group">
                           <div className="flex justify-between items-start mb-3">
                             <div className="flex-1 mr-4">
                               <input 
                                 type="text"
                                 value={addr.label}
                                 onChange={(e) => updateAddress(i, 'label', e.target.value)}
                                 disabled={!isEditing}
                                 className="w-full bg-transparent border-none p-0 text-sm font-bold text-foreground focus:ring-0 placeholder:text-muted-foreground"
                                 placeholder="e.g. Main Warehouse"
                               />
                             </div>
                             <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                               {addr.isDefaultShipping && (
                                 <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                   <Star weight="fill" className="w-3 h-3"/> Shipping
                                 </span>
                               )}
                               {addr.isDefaultBilling && (
                                 <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full">
                                   <Star weight="fill" className="w-3 h-3"/> Billing
                                 </span>
                               )}
                               {isEditing && (
                                 <button type="button" onClick={() => removeAddress(i)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors ml-1">
                                   <Trash weight="bold" className="w-4 h-4"/>
                                 </button>
                               )}
                             </div>
                           </div>
                           
                           <textarea
                             value={addr.fullAddress}
                             onChange={(e) => updateAddress(i, 'fullAddress', e.target.value)}
                             disabled={!isEditing}
                             rows="2"
                             className="w-full bg-secondary/50 border border-border/50 rounded-xl p-3 text-sm text-foreground focus:border-accent focus:ring-1 focus:ring-accent transition-all resize-none disabled:bg-secondary/30 disabled:text-muted-foreground font-medium mb-3"
                             placeholder="Full address..."
                           />

                           {isEditing && (
                             <div className="flex items-center gap-4 border-t border-border/50 pt-3">
                               <label className="flex items-center gap-2 cursor-pointer group/cb">
                                 <input 
                                   type="checkbox" 
                                   checked={addr.isDefaultShipping}
                                   onChange={(e) => updateAddress(i, 'isDefaultShipping', e.target.checked)}
                                   className="rounded border-border text-accent focus:ring-accent w-4 h-4"
                                 />
                                 <span className="text-xs font-semibold text-muted-foreground group-hover/cb:text-foreground transition-colors">Default Shipping</span>
                               </label>
                               <label className="flex items-center gap-2 cursor-pointer group/cb">
                                 <input 
                                   type="checkbox" 
                                   checked={addr.isDefaultBilling}
                                   onChange={(e) => updateAddress(i, 'isDefaultBilling', e.target.checked)}
                                   className="rounded border-border text-accent focus:ring-accent w-4 h-4"
                                 />
                                 <span className="text-xs font-semibold text-muted-foreground group-hover/cb:text-foreground transition-colors">Default Billing</span>
                               </label>
                             </div>
                           )}
                        </div>
                      ))}
                    </div>

                    {isEditing && (
                      <div className="pt-4 border-t border-border/50 relative">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">Search to Add Address</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <MagnifyingGlass weight="bold" className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <input
                            type="text"
                            value={addressQuery}
                            onChange={handleAddressSearch}
                            className="w-full pl-12 pr-4 py-3.5 bg-background border border-border rounded-2xl text-foreground focus:outline-none focus:border-accent transition-all font-medium text-base sm:text-sm"
                            placeholder="Type an address to search Google Maps / OSM..."
                          />
                          {isSearchingAddress && (
                            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                               <CircleNotch className="w-4 h-4 text-accent animate-spin" />
                            </div>
                          )}
                        </div>

                        {addressSuggestions.length > 0 && (
                          <div className="absolute z-50 bottom-full mb-2 w-full bg-background border border-border rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                            {addressSuggestions.map((s, i) => (
                              <button 
                                key={i}
                                type="button"
                                onClick={() => handleSelectAddress(s)}
                                className="w-full text-left px-4 py-3 border-b border-border/50 hover:bg-secondary text-sm flex items-start gap-3 transition-colors"
                              >
                                <MapPin weight="fill" className="w-4 h-4 text-accent shrink-0 mt-0.5"/>
                                <span className="font-medium text-foreground">{s.display_name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </form>
              )}
            </div>

            {/* Bottom Sticky Action Bar */}
            <AnimatePresence>
              {isEditing && activeTab !== 'security' && (
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 20, opacity: 0 }}
                  className="p-5 border-t border-border/50 bg-background/80 backdrop-blur-xl shrink-0"
                >
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleSave()}
                      disabled={isLoading}
                      className="w-full sm:flex-1 py-3.5 bg-accent hover:bg-accent/90 text-white font-bold rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-accent/20 active:translate-y-[1px]"
                    >
                      {isLoading ? <CircleNotch weight="bold" className="w-5 h-5 animate-spin" /> : 'Save Changes'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="w-full sm:flex-1 py-3.5 bg-secondary hover:bg-muted text-foreground font-bold rounded-2xl border border-border transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
