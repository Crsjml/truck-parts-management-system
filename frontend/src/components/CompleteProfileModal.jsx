import React, { useState, useEffect, useRef } from 'react';
import { CircleNotch, CheckCircle, Phone } from '@phosphor-icons/react';
import { updateCustomerProfile } from '../authStore';
import Logo from './Logo';

export default function CompleteProfileModal({ onComplete }) {
  const [contactNumber, setContactNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const submitButtonRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === inputRef.current) {
          e.preventDefault();
          submitButtonRef.current?.focus();
        }
      } else {
        if (document.activeElement === submitButtonRef.current) {
          e.preventDefault();
          inputRef.current?.focus();
        }
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (contactNumber.trim().length < 10) {
      setError('Valid contact number is required');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      await updateCustomerProfile({ phoneNumber: contactNumber.trim(), contact_number: contactNumber.trim() });
      onComplete();
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full rounded-xl border border-border bg-background pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-slate-600 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20';
  const fieldIconClass = 'pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="complete-profile-title"
    >
      <div className="w-full max-w-md rounded-3xl bg-background border border-border p-8 shadow-2xl animate-scaleUp">
        <div className="flex flex-col items-center text-center space-y-4">
          <Logo className="w-16 h-16" showText={false} />
          
          <div>
            <h2 id="complete-profile-title" className="text-2xl font-bold tracking-tight text-foreground">Complete Profile</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Please provide your contact number to complete your account setup.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="w-full space-y-4 mt-4 text-left">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">Contact number</label>
              <div className="relative">
                <Phone weight="bold" className={fieldIconClass} />
                <input
                  ref={inputRef}
                  type="text"
                  className={`${inputClass} ${error ? 'border-red-500 ring-2 ring-red-500/20 focus:border-red-500' : ''}`}
                  value={contactNumber}
                  onChange={(e) => {
                    setContactNumber(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="+63 917 123 4567"
                  disabled={loading}
                />
              </div>
              {error && <p className="text-xs text-red-400 font-semibold">{error}</p>}
            </div>
            
            <button
              ref={submitButtonRef}
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3.5 text-sm font-bold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? <CircleNotch weight="duotone" className="h-5 w-5 animate-spin" /> : <CheckCircle weight="duotone" className="h-5 w-5" />}
              Save Contact Number
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
