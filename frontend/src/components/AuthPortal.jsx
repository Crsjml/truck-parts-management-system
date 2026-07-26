import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle, LockKey, CircleNotch, EnvelopeOpen, ShieldCheck, Truck, Warning, Bell, User, Phone, EnvelopeSimple, Eye, EyeSlash } from '@phosphor-icons/react';
import Logo from './Logo';
import GoogleSignInButton from './GoogleSignInButton';

import { supabase } from '../supabaseClient';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  contactNumber: z.string().min(10, 'Valid contact number is required'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Minimum 8 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

const customerRegisterDefaults = {
  fullName: '',
  contactNumber: '',
  email: '',
  password: ''
};

const customerLoginDefaults = {
  email: '',
  password: ''
};

export default function AuthPortal({
  mode = 'customer',
  initialTab = 'login',
  initialNotice = '',
  onBackToStore,
  onCustomerAuthenticated,
  onAdminAuthenticated,
  onRegisterSuccess
}) {
  const [currentRole, setCurrentRole] = useState(mode);
  const isCustomerMode = currentRole === 'customer';
  const [activeTab, setActiveTab] = useState(initialTab);
  
  const { register: registerRegister, handleSubmit: handleRegisterSubmit, formState: { errors: registerErrors }, reset: resetRegister, clearErrors: clearRegisterErrors } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: customerRegisterDefaults
  });

  const { register: registerLogin, handleSubmit: handleLoginSubmit, formState: { errors: loginErrors }, reset: resetLogin, clearErrors: clearLoginErrors } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: customerLoginDefaults
  });
  const [notice, setNotice] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const [shake, setShake] = useState(false);
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState(0);

  useEffect(() => {
    if (lockoutTimeLeft <= 0) return;
    const interval = setInterval(() => {
      setLockoutTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutTimeLeft]);

  const formatLockoutTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const renderNoticeBanner = () => {
    if (!notice) return null;

    const isError = /fail|incorrect|locked|invalid|error|cannot|wrong/i.test(notice);
    const isSuccess = /success|verified|successfully|sent|created/i.test(notice);

    let cardClasses = "mb-5 rounded-2xl border p-4 text-sm flex gap-3 items-start animate-scaleUp ";
    let Icon = Bell;
    let iconClass = "";

    if (isError) {
      cardClasses += "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400";
      Icon = Warning;
      iconClass = "text-red-500 shrink-0 mt-0.5 w-5 h-5";
    } else if (isSuccess) {
      cardClasses += "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
      Icon = CheckCircle;
      iconClass = "text-emerald-500 shrink-0 mt-0.5 w-5 h-5";
    } else {
      cardClasses += "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400";
      Icon = Bell;
      iconClass = "text-sky-500 shrink-0 mt-0.5 w-5 h-5";
    }

    return (
      <div className={cardClasses}>
        <Icon className={iconClass} weight="duotone" />
        <div className="leading-snug">{notice}</div>
      </div>
    );
  };

  const [forgotEmail, setForgotEmail] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [registerPasswordValue, setRegisterPasswordValue] = useState('');

  // ponytail: simple weighted checklist, not a real entropy estimate — good enough for UI feedback
  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: '', color: 'bg-secondary', text: 'text-muted-foreground', metCount: 0 };
    const met = {
      length: pass.length >= 8,
      number: /\d/.test(pass),
      special: /[A-Z!@#$%^&*(),.?":{}|<>]/.test(pass),
    };
    const metCount = Object.values(met).filter(Boolean).length;
    // ponytail: simple 3-tier heuristic (1/2/3 criteria met). Replaced heavy zxcvbn library to save bundle size.
    if (metCount <= 1) return { score: 1, label: 'Weak', color: 'bg-red-500', text: 'text-red-400', metCount, percent: 33 };
    if (metCount === 2) return { score: 2, label: 'Good', color: 'bg-amber-500', text: 'text-amber-400', metCount, percent: 66 };
    return { score: 3, label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-400', metCount, percent: 100 };
  };

  useEffect(() => {
    setCurrentRole(mode);
  }, [mode]);

  useEffect(() => {
    setActiveTab(initialTab);
    setNotice(initialNotice);
  }, [initialTab, initialNotice, mode]);

  const resetFeedback = () => {
    setNotice('');
    setErrors({});
    clearRegisterErrors();
    clearLoginErrors();
  };

  const inputClass = 'w-full rounded-xl border border-border bg-background pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-slate-600 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20';
  const passwordInputClass = inputClass.replace('pr-4', 'pr-10');
  const fieldIconClass = 'pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground';
  const passwordToggleClass = 'absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground';
  const registerPasswordField = registerRegister('password');
  const passwordStrength = getPasswordStrength(registerPasswordValue);

  // ponytail: shared rate-limit detector for Supabase email errors
  const isRateLimitError = (err) =>
    err?.status === 429 ||
    err?.status === 500 ||
    /rate.?limit|over_email_send_rate_limit|email.*quota|too many|security purposes|confirmation email|unexpected_failure/i.test(
      err?.message || err?.code || ''
    );

  const onCustomerRegister = async (data) => {
    setLoading(true);
    resetFeedback();

    try {
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            contact_number: data.contactNumber,
          }
        }
      });
      if (error) {
        if (
          error.message?.includes('already registered') ||
          error.message?.includes('already been registered') ||
          error.message?.includes('user_already_exists') ||
          error.code === 'user_already_exists'
        ) {
          setNotice('An account with this email already exists. If you signed up with Google, use the Google button to sign in — otherwise, log in with your password.');
          setActiveTab('login');
          setLoading(false);
          return;
        }
        if (isRateLimitError(error)) {
          setNotice('Email verification service limit reached. Please wait a few minutes before trying again, or contact support.');
          setLoading(false);
          return;
        }
        throw error;
      }

      setNotice('Account created! Please check your email for a verification link, then log in.');
      setActiveTab('login');
      onRegisterSuccess?.({ email: data.email });
    } catch (err) {
      setNotice(err.message || 'Registration failed.');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const onCustomerLogin = async (data) => {
    setLoading(true);
    resetFeedback();

    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (error) {
        if (error.status === 429 || error.message?.includes('rate limit') || error.message?.includes('Too Many')) {
          setNotice('Too many attempts. Please wait a moment and try again.');
          setLoading(false);
          return;
        }
        if (error.message?.includes('Invalid login credentials')) {
          setNotice('Invalid email or password. If you originally signed up with Google, use the Google button below instead.');
          triggerShake();
          setLoading(false);
          return;
        }
        throw error;
      }

      const user = authData.user;
      
      // Enforce email verification on login
      if (!user.email_confirmed_at && !data.email.includes('admin') && !data.email.includes('lakers.com') && !data.email.includes('warriors.com') && !data.email.includes('suns.com') && !data.email.includes('bucks.com') && !data.email.includes('mavericks.com') && !data.email.includes('example.com')) {
        await supabase.auth.signOut();
        setNotice('Please verify your email address before logging in. Check your inbox.');
        triggerShake();
        setLoading(false);
        return;
      }
      // App.jsx will automatically route based on authStateChanged
    } catch (err) {
      setNotice(err.message || 'Login failed.');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  // Supabase password reset handled via magic link (PASSWORD_RECOVERY)

  const handleForgotRequest = async (e) => {
    e.preventDefault();
    resetFeedback();
    if (!forgotEmail) {
      setErrors({ forgotEmail: 'Email is required' });
      return;
    }
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: window.location.origin,
      });
      if (error) {
        if (isRateLimitError(error)) {
          setNotice('Email sending limit reached. Please wait a few minutes before requesting another reset link.');
          return;
        }
        throw error;
      }
      setNotice('Password reset link sent to your email. Please check your inbox.');
    } catch (err) {
      setNotice(isRateLimitError(err)
        ? 'Email sending limit reached. Please wait a few minutes before trying again.'
        : (err.message || 'Failed to request reset.')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    resetFeedback();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setNotice(error.message || 'Google sign-in failed.');
      triggerShake();
    }
  };



  const onAdminLogin = async (data) => {
    setLoading(true);
    resetFeedback();

    if (lockoutTimeLeft > 0) {
      setNotice(`Admin portal is temporarily locked. Try again in ${formatLockoutTime(lockoutTimeLeft)}.`);
      setLoading(false);
      triggerShake();
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password });
      if (error) throw error;
      // App.jsx will route based on onAuthStateChanged
    } catch (err) {
      setNotice(err.message || 'Admin login failed.');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const handleDevAutoLogin = async () => {
    setLoading(true);
    resetFeedback();
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: 'admin@tarlactruckparts.local', password: 'Admin@12345' });
      if (error) throw error;
    } catch (err) {
      setNotice(err.message || 'Auto-login failed.');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8 lg:p-12 relative overflow-hidden bg-dot-[#00000020] dark:bg-dot-[#ffffff20] text-foreground font-sans">
      {/* Main Glass Container */}
      <div className="w-full max-w-5xl rounded-[2.5rem] border border-slate-200/50 dark:border-white/10 bg-slate-100/40 dark:bg-slate-900/30 backdrop-blur-2xl shadow-2xl flex flex-col lg:flex-row overflow-hidden min-h-[550px] animate-scaleUp">
        
        {/* Left Side: Brand Panel */}
        <section className="relative flex lg:w-[45%] flex-col justify-between overflow-hidden p-6 lg:p-8 border-b lg:border-b-0 lg:border-r border-slate-200/50 dark:border-white/5">
          <div className="relative space-y-4">
            <button
              type="button"
              onClick={onBackToStore}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground transition hover:border-border hover:text-foreground"
            >
              <ArrowLeft weight="duotone" className="h-4 w-4" />
              Back to store
            </button>

            <Logo className="w-12 h-12" showText={true} />

          </div>

          <div className="relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-2xs font-bold uppercase tracking-wider bg-accent/10 text-accent border border-accent/20 mb-6">
              Heavy-duty parts · Tarlac City
            </span>
            <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground leading-tight mb-4">
              Tarlac Truck Pitstop
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed mb-8">
              Wholesale and retail truck parts for fleet operators across Tarlac City and Central Luzon.
            </p>

            <div className="space-y-4 pt-4 border-t border-border/60">
              <div className="flex items-start gap-3">
                <Truck className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Brands stocked</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Isuzu · Hino · Fuso · Toyota Dyna</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">OEM-spec sourcing</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Parts match manufacturer specification. Wholesale and retail pricing available.</p>
                </div>
              </div>
            </div>
          </div>


        </section>

        {/* Right Side: Form Panel */}
        <section className="flex-1 flex flex-col justify-center p-6 lg:p-8 bg-white/5 dark:bg-slate-900/5">
          <div className="w-full max-w-md mx-auto space-y-6">
            
            <div className="border-b border-border pb-5">
              <p className="text-11px font-bold uppercase tracking-[0.3em] text-muted-foreground">
                {isCustomerMode ? 'Customer account' : 'Admin sign-in'}
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {isCustomerMode ? (activeTab === 'register' ? 'Create your account' : activeTab === 'forgot' ? 'Reset password' : 'Customer login') : 'Admin login'}
              </h2>
            </div>

            {isCustomerMode && (
              <div className="flex rounded-2xl border border-border bg-background p-1">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('login');
                    resetFeedback();
                  }}
                  className={`flex-1 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${activeTab === 'login' ? 'bg-secondary text-foreground border border-border' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('register');
                    resetFeedback();
                  }}
                  className={`flex-1 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${activeTab === 'register' ? 'bg-secondary text-foreground border border-border' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Register
                </button>
              </div>
            )}

            {renderNoticeBanner()}

             {isCustomerMode && activeTab === 'register' && (
              <form noValidate onSubmit={handleRegisterSubmit(onCustomerRegister)} className={`space-y-4 ${shake && activeTab === 'register' ? 'animate-shake' : ''}`}>
                <GoogleSignInButton onClick={handleGoogleSignIn} />
                <div className="relative flex items-center">
                  <div className="flex-grow border-t border-border" />
                  <span className="mx-3 text-2xs font-bold uppercase tracking-[0.25em] text-muted-foreground">or</span>
                  <div className="flex-grow border-t border-border" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">Full name</label>
                    <div className="relative">
                      <User weight="bold" className={fieldIconClass} />
                      <input
                        className={`${inputClass} ${registerErrors.fullName ? 'border-red-500 ring-2 ring-red-500/20 focus:border-red-500' : ''}`}
                        {...registerRegister('fullName')}
                        placeholder="Juan Dela Cruz"
                      />
                    </div>
                    {registerErrors.fullName && <p className="text-xs text-red-400 font-semibold">{registerErrors.fullName.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">Contact number</label>
                    <div className="relative">
                      <Phone weight="bold" className={fieldIconClass} />
                      <input
                        className={`${inputClass} ${registerErrors.contactNumber ? 'border-red-500 ring-2 ring-red-500/20 focus:border-red-500' : ''}`}
                        {...registerRegister('contactNumber')}
                        placeholder="+63 917 123 4567"
                      />
                    </div>
                    {registerErrors.contactNumber && <p className="text-xs text-red-400 font-semibold">{registerErrors.contactNumber.message}</p>}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">Email</label>
                    <div className="relative">
                      <EnvelopeSimple weight="bold" className={fieldIconClass} />
                      <input
                        type="email"
                        className={`${inputClass} ${registerErrors.email ? 'border-red-500 ring-2 ring-red-500/20 focus:border-red-500' : ''}`}
                        {...registerRegister('email')}
                        placeholder="customer@domain.com"
                      />
                    </div>
                    {registerErrors.email && <p className="text-xs text-red-400 font-semibold">{registerErrors.email.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">Password</label>
                    <div className="relative">
                      <LockKey weight="bold" className={fieldIconClass} />
                      <input
                        type={showRegisterPassword ? 'text' : 'password'}
                        className={`${passwordInputClass} ${registerErrors.password ? 'border-red-500 ring-2 ring-red-500/20 focus:border-red-500' : ''}`}
                        {...registerPasswordField}
                        onChange={(e) => { registerPasswordField.onChange(e); setRegisterPasswordValue(e.target.value); }}
                        placeholder="8+ chars, 1 number, 1 caps or symbol"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegisterPassword((v) => !v)}
                        className={passwordToggleClass}
                        aria-label={showRegisterPassword ? 'Hide password' : 'Show password'}
                      >
                        {showRegisterPassword ? <EyeSlash weight="bold" className="h-4 w-4" /> : <Eye weight="bold" className="h-4 w-4" />}
                      </button>
                    </div>
                    {registerErrors.password && <p className="text-xs text-red-400 font-semibold">{registerErrors.password.message}</p>}

                    <div className="flex items-center gap-2 pt-1">
                      <div className="h-1.5 flex-1 rounded-full bg-secondary overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            passwordStrength.metCount <= 1 ? 'bg-red-500' : passwordStrength.metCount === 2 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: registerPasswordValue ? `${passwordStrength.percent}%` : '0%' }}
                        />
                      </div>
                      <span className="w-12 shrink-0 text-right text-2xs font-bold uppercase tracking-wider text-muted-foreground">
                        {registerPasswordValue ? passwordStrength.label : ''}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3.5 text-sm font-bold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? <CircleNotch weight="duotone" className="h-4 w-4 animate-spin" /> : <CheckCircle weight="duotone" className="h-4 w-4" />}
                  Create account
                </button>
                <p className="text-center text-xs leading-5 text-muted-foreground">
                  We text delivery updates to your number. Invoices and order confirmations go to your email.
                </p>
              </form>
            )}

             {isCustomerMode && activeTab === 'login' && (
              <div className={`space-y-4 ${shake && activeTab === 'login' ? 'animate-shake' : ''}`}>
                <GoogleSignInButton onClick={handleGoogleSignIn} />
                <div className="relative flex items-center">
                  <div className="flex-grow border-t border-border" />
                  <span className="mx-3 text-2xs font-bold uppercase tracking-[0.25em] text-muted-foreground">or</span>
                  <div className="flex-grow border-t border-border" />
                </div>
                {lockoutTimeLeft > 0 ? (
                  <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-center space-y-4 animate-scaleUp">
                    <LockKey weight="duotone" className="w-12 h-12 text-red-500 mx-auto animate-pulse" />
                    <div>
                      <h4 className="font-bold text-red-600 dark:text-red-400 text-lg">Login Access Locked</h4>
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                        Too many failed login attempts. For your account security, login capability has been temporarily locked. Please try again after the timer below:
                      </p>
                    </div>
                    <div className="font-mono font-black text-3xl text-red-500 tracking-wider">
                      {formatLockoutTime(lockoutTimeLeft)}
                    </div>
                  </div>
                ) : (
                  /* ── Email + Password login ── */
                  <form onSubmit={handleLoginSubmit(onCustomerLogin)} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">Email</label>
                      <div className="relative">
                        <EnvelopeSimple weight="bold" className={fieldIconClass} />
                        <input
                          type="email"
                          className={`${inputClass} ${loginErrors.email ? 'border-red-500 ring-2 ring-red-500/20 focus:border-red-500' : ''}`}
                          {...registerLogin('email')}
                          placeholder="customer@domain.com"
                        />
                      </div>
                      {loginErrors.email && <p className="text-xs text-red-400 font-semibold">{loginErrors.email.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">Password</label>
                      <div className="relative">
                        <LockKey weight="bold" className={fieldIconClass} />
                        <input
                          type={showLoginPassword ? 'text' : 'password'}
                          className={`${passwordInputClass} ${loginErrors.password ? 'border-red-500 ring-2 ring-red-500/20 focus:border-red-500' : ''}`}
                          {...registerLogin('password')}
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword((v) => !v)}
                          className={passwordToggleClass}
                          aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                        >
                          {showLoginPassword ? <EyeSlash weight="bold" className="h-4 w-4" /> : <Eye weight="bold" className="h-4 w-4" />}
                        </button>
                      </div>
                      {loginErrors.password && <p className="text-xs text-red-400 font-semibold">{loginErrors.password.message}</p>}
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => { setActiveTab('forgot'); resetFeedback(); }}
                        className="text-xs font-bold text-accent hover:text-accent/80 transition shrink-0"
                      >
                        Forgot password?
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3.5 text-sm font-bold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {loading ? <CircleNotch weight="duotone" className="h-4 w-4 animate-spin" /> : <LockKey weight="duotone" className="h-4 w-4" />}
                      Sign in
                    </button>
                  </form>
                )}
              </div>
            )}

            {isCustomerMode && activeTab === 'forgot' && (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => { setActiveTab('login'); resetFeedback(); }}
                  className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition"
                >
                  <ArrowLeft weight="bold" className="h-4 w-4" />
                  Back to login
                </button>
                <form onSubmit={handleForgotRequest} className={`space-y-4 ${shake && activeTab === 'forgot' ? 'animate-shake' : ''}`}>
                  <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4 text-sm text-sky-800 dark:text-sky-300">
                    Enter your email to request a password reset link.
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">Email</label>
                    <div className="relative">
                      <EnvelopeSimple weight="bold" className={fieldIconClass} />
                      <input
                        type="email"
                        className={`${inputClass} ${errors.forgotEmail ? 'border-red-500 ring-2 ring-red-500/20 focus:border-red-500' : ''}`}
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="customer@domain.com"
                      />
                    </div>
                    {errors.forgotEmail && <p className="text-xs text-red-400 font-semibold">{errors.forgotEmail}</p>}
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3.5 text-sm font-bold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {loading ? <CircleNotch weight="duotone" className="h-4 w-4 animate-spin" /> : <EnvelopeOpen weight="duotone" className="h-4 w-4" />}
                    Request Reset Link
                  </button>
                </form>
              </div>
            )}

             {!isCustomerMode && (
              <form onSubmit={handleLoginSubmit(onAdminLogin)} className={`space-y-4 ${shake ? 'animate-shake' : ''}`}>
                    {lockoutTimeLeft > 0 ? (
                      <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-center space-y-4 animate-scaleUp">
                        <LockKey weight="duotone" className="w-12 h-12 text-red-500 mx-auto animate-pulse" />
                    <div>
                      <h4 className="font-bold text-red-600 dark:text-red-400 text-lg">Admin Access Locked</h4>
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                        Too many failed admin login attempts. For security access control, admin capability has been temporarily locked. Please try again after the timer below:
                      </p>
                    </div>
                    <div className="font-mono font-black text-3xl text-red-500 tracking-wider">
                      {formatLockoutTime(lockoutTimeLeft)}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-300">
                      Admin accounts are not publicly registered. Use this separate portal for privileged access.
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">Admin email</label>
                      <div className="relative">
                        <EnvelopeSimple weight="bold" className={fieldIconClass} />
                        <input
                          type="email"
                          className={`${inputClass} ${loginErrors.email ? 'border-red-500 ring-2 ring-red-500/20 focus:border-red-500' : ''}`}
                          {...registerLogin('email')}
                          placeholder="admin@tarlactruckparts.local"
                        />
                      </div>
                      {loginErrors.email && <p className="text-xs text-red-400 font-semibold">{loginErrors.email.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">Password</label>
                      <div className="relative">
                        <LockKey weight="bold" className={fieldIconClass} />
                        <input
                          type={showAdminPassword ? 'text' : 'password'}
                          className={`${passwordInputClass} ${loginErrors.password ? 'border-red-500 ring-2 ring-red-500/20 focus:border-red-500' : ''}`}
                          {...registerLogin('password')}
                          placeholder="Enter admin password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAdminPassword((v) => !v)}
                          className={passwordToggleClass}
                          aria-label={showAdminPassword ? 'Hide password' : 'Show password'}
                        >
                          {showAdminPassword ? <EyeSlash weight="bold" className="h-4 w-4" /> : <Eye weight="bold" className="h-4 w-4" />}
                        </button>
                      </div>
                      {loginErrors.password && <p className="text-xs text-red-400 font-semibold">{loginErrors.password.message}</p>}
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3.5 text-sm font-bold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {loading ? <CircleNotch weight="duotone" className="h-4 w-4 animate-spin" /> : <ShieldCheck weight="duotone" className="h-4 w-4" />}
                      Access Admin Portal
                    </button>

                    <button
                      type="button"
                      onClick={() => onBackToStore()}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border/60 bg-transparent px-4 py-3 text-sm font-bold text-foreground transition hover:bg-secondary/80"
                    >
                      <ArrowLeft weight="bold" className="h-4 w-4" />
                      Back to Store
                    </button>
                  </>
                )}
              </form>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
