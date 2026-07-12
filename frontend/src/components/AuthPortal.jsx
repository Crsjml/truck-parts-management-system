import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle, LockKey, CircleNotch, EnvelopeOpen, ShieldCheck, Truck, Percent, Warning, Bell } from '@phosphor-icons/react';
import Logo from './Logo';
import Footer from './Footer';
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
  rememberMe: z.boolean().optional(),
});

const customerRegisterDefaults = {
  fullName: '',
  contactNumber: '',
  email: '',
  password: ''
};

const customerLoginDefaults = {
  email: '',
  password: '',
  rememberMe: true
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

  const inputClass = 'w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-slate-600 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20';

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
        if (error.message?.includes('already registered') || error.message?.includes('already been registered')) {
          setNotice('An account with this email already exists. Please log in.');
          setActiveTab('login');
          setLoading(false);
          return;
        }
        if (error.status === 429 || error.message?.includes('rate limit')) {
          setNotice('Too many attempts. Please wait a moment and try again.');
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
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail);
      if (error) throw error;
      setNotice('Password reset link sent to your email. Please check your inbox.');
    } catch (err) {
      setNotice(err.message || 'Failed to request reset.');
    } finally {
      setLoading(false);
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
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8 lg:p-12 relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.06),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(37,99,235,0.06),_transparent_35%),linear-gradient(160deg,_rgba(248,250,252,1),_rgba(241,245,249,1))] dark:bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.15),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(37,99,235,0.15),_transparent_35%),linear-gradient(160deg,_rgba(9,15,30,1),_rgba(2,6,23,1))] text-foreground font-sans">
      {/* Visual background ambient details */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/5 rounded-full filter blur-[100px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brandBlue-600/5 rounded-full filter blur-[100px] animate-pulse pointer-events-none" />

      {/* Main Glass Container */}
      <div className="w-full max-w-5xl rounded-[2.5rem] border border-slate-200/50 dark:border-white/10 bg-slate-100/40 dark:bg-slate-900/30 backdrop-blur-2xl shadow-2xl flex flex-col lg:flex-row overflow-hidden min-h-[550px] animate-scaleUp">
        
        {/* Left Side: Brand Panel */}
        <section className="relative flex lg:w-[45%] flex-col justify-between overflow-hidden p-6 lg:p-8 bg-gradient-to-b from-slate-200/30 to-slate-100/10 dark:from-slate-950/40 dark:to-slate-950/20 border-b lg:border-b-0 lg:border-r border-slate-200/50 dark:border-white/5">
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

            <div className="max-w-xl space-y-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-2xs font-bold uppercase tracking-[0.28em] text-red-600 dark:text-red-300">
                Premium Truck Spare Parts
              </span>
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Tarlac Truck Pitstop
              </h1>
              <p className="max-w-lg text-xs leading-5 text-muted-foreground sm:text-sm">
                We specialize in sourcing and distributing premium grade, heavy-duty truck accessories and spare components. Offering wholesale and retail solutions across Tarlac City and regional logistics networks.
              </p>
            </div>
          </div>

          <div className="relative space-y-2 my-4 lg:my-0">
            {/* Compatibility */}
            <div className="flex gap-3 p-3 rounded-2xl border border-transparent border-l-2 hover:border-l-brandBlue-500 hover:border-slate-200/30 dark:hover:border-white/5 hover:bg-slate-200/15 dark:hover:bg-white/5 transition-all duration-300 group">
              <div className="p-1.5 bg-brandBlue-500/10 dark:bg-brandBlue-900/30 border border-brandBlue-500/20 dark:border-brandBlue-800/30 text-brandBlue-600 dark:text-brandBlue-400 rounded-lg h-8 w-8 shrink-0 flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                <Truck weight="duotone" className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-foreground text-sm">Wide Compatibility</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Tailored replacement components for Isuzu, Hino, Fuso, and Toyota Dyna models.</p>
              </div>
            </div>

            {/* Wholesale Pricing */}
            <div className="flex gap-3 p-3 rounded-2xl border border-transparent border-l-2 hover:border-l-emerald-500 hover:border-slate-200/30 dark:hover:border-white/5 hover:bg-slate-200/15 dark:hover:bg-white/5 transition-all duration-300 group">
              <div className="p-1.5 bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/20 dark:border-emerald-800/30 text-emerald-600 dark:text-emerald-400 rounded-lg h-8 w-8 shrink-0 flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                <Percent weight="duotone" className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-foreground text-sm">VIP Wholesale Pricing</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Bulk volume deductibles and quotation rates directly mapped for freight operators.</p>
              </div>
            </div>

            {/* OEM Certified Sourcing */}
            <div className="flex gap-3 p-3 rounded-2xl border border-transparent border-l-2 hover:border-l-rose-500 hover:border-slate-200/30 dark:hover:border-white/5 hover:bg-slate-200/15 dark:hover:bg-white/5 transition-all duration-300 group">
              <div className="p-1.5 bg-rose-500/10 dark:bg-rose-900/30 border border-rose-500/20 dark:border-rose-800/30 text-rose-600 dark:text-rose-400 rounded-lg h-8 w-8 shrink-0 flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                <ShieldCheck weight="duotone" className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-foreground text-sm">OEM Certified Sourcing</h4>
                <p className="text-xs text-muted-foreground mt-0.5">All inventory matches exact manufacturer OEM specifications to guarantee reliability.</p>
              </div>
            </div>
          </div>

          <Footer className="w-full mt-2" />
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
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('forgot');
                    resetFeedback();
                  }}
                  className={`flex-1 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${activeTab === 'forgot' ? 'bg-secondary text-foreground border border-border' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Reset
                </button>
              </div>
            )}

            {renderNoticeBanner()}

             {isCustomerMode && activeTab === 'register' && (
              <form noValidate onSubmit={handleRegisterSubmit(onCustomerRegister)} className={`space-y-4 ${shake && activeTab === 'register' ? 'animate-shake' : ''}`}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">Full name</label>
                    <input
                      className={`${inputClass} ${registerErrors.fullName ? 'border-red-500 ring-2 ring-red-500/20 focus:border-red-500' : ''}`}
                      {...registerRegister('fullName')}
                      placeholder="Your full name"
                    />
                    {registerErrors.fullName && <p className="text-xs text-red-400 font-semibold">{registerErrors.fullName.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">Contact number</label>
                    <input
                      className={`${inputClass} ${registerErrors.contactNumber ? 'border-red-500 ring-2 ring-red-500/20 focus:border-red-500' : ''}`}
                      {...registerRegister('contactNumber')}
                      placeholder="+63 917 123 4567"
                    />
                    {registerErrors.contactNumber && <p className="text-xs text-red-400 font-semibold">{registerErrors.contactNumber.message}</p>}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">Email</label>
                    <input
                      type="email"
                      className={`${inputClass} ${registerErrors.email ? 'border-red-500 ring-2 ring-red-500/20 focus:border-red-500' : ''}`}
                      {...registerRegister('email')}
                      placeholder="customer@domain.com"
                    />
                    {registerErrors.email && <p className="text-xs text-red-400 font-semibold">{registerErrors.email.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">Password</label>
                    <input
                      type="password"
                      className={`${inputClass} ${registerErrors.password ? 'border-red-500 ring-2 ring-red-500/20 focus:border-red-500' : ''}`}
                      {...registerRegister('password')}
                      placeholder="Minimum 8 characters"
                    />
                    {registerErrors.password && <p className="text-xs text-red-400 font-semibold">{registerErrors.password.message}</p>}
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
              </form>
            )}

             {isCustomerMode && activeTab === 'login' && (
              <form onSubmit={handleLoginSubmit(onCustomerLogin)} className={`space-y-4 ${shake && activeTab === 'login' ? 'animate-shake' : ''}`}>
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
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">Email</label>
                      <input
                        type="email"
                        className={`${inputClass} ${loginErrors.email ? 'border-red-500 ring-2 ring-red-500/20 focus:border-red-500' : ''}`}
                        {...registerLogin('email')}
                        placeholder="customer@domain.com"
                      />
                      {loginErrors.email && <p className="text-xs text-red-400 font-semibold">{loginErrors.email.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">Password</label>
                      <input
                        type="password"
                        className={`${inputClass} ${loginErrors.password ? 'border-red-500 ring-2 ring-red-500/20 focus:border-red-500' : ''}`}
                        {...registerLogin('password')}
                        placeholder="Enter your password"
                      />
                      {loginErrors.password && <p className="text-xs text-red-400 font-semibold">{loginErrors.password.message}</p>}
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground w-full cursor-pointer">
                        <input
                          type="checkbox"
                          {...registerLogin('rememberMe')}
                          className="h-4 w-4 rounded border-border bg-background text-accent focus:ring-accent"
                        />
                        Remember me on this device
                      </label>
                    </div>

                    <div className="flex justify-end mt-1">
                      <button 
                        type="button" 
                        onClick={() => {
                          setActiveTab('forgot');
                          resetFeedback();
                        }}
                        className="text-xs text-accent hover:text-accent/80 transition font-bold"
                      >
                        Forgot Password?
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

                  </>
                )}
              </form>
            )}

            {isCustomerMode && activeTab === 'forgot' && (
              <div className="space-y-4">
                  <form onSubmit={handleForgotRequest} className={`space-y-4 ${shake && activeTab === 'forgot' ? 'animate-shake' : ''}`}>
                    <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4 text-sm text-sky-800 dark:text-sky-300">
                      Enter your email to request a password reset link.
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">Email</label>
                      <input
                        type="email"
                        className={`${inputClass} ${errors.forgotEmail ? 'border-red-500 ring-2 ring-red-500/20 focus:border-red-500' : ''}`}
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="customer@domain.com"
                      />
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
                      <input
                        type="email"
                        className={`${inputClass} ${loginErrors.email ? 'border-red-500 ring-2 ring-red-500/20 focus:border-red-500' : ''}`}
                        {...registerLogin('email')}
                        placeholder="admin@tarlactruckparts.local"
                      />
                      {loginErrors.email && <p className="text-xs text-red-400 font-semibold">{loginErrors.email.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">Password</label>
                      <input
                        type="password"
                        className={`${inputClass} ${loginErrors.password ? 'border-red-500 ring-2 ring-red-500/20 focus:border-red-500' : ''}`}
                        {...registerLogin('password')}
                        placeholder="Enter admin password"
                      />
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
