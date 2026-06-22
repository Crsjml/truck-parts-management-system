import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle, LockKey, CircleNotch, EnvelopeOpen, ShieldCheck, Truck, Percent, User, Warning, Bell } from '@phosphor-icons/react';
import Logo from './Logo';
import Footer from './Footer';
import {
  getVerificationNotice,
  loginAdmin,
  loginCustomer,
  registerCustomer,
  requestPasswordReset,
  resetPassword,
  resendVerificationCode,
  validateLoginFields,
  validateRegistrationFields,
  validateVerificationCode,
  verifyCustomerEmail
} from '../authStore';

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
  const [registerForm, setRegisterForm] = useState(customerRegisterDefaults);
  const [loginForm, setLoginForm] = useState(customerLoginDefaults);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationInput, setVerificationInput] = useState('');
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
  const [forgotToken, setForgotToken] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotStep, setForgotStep] = useState(1);

  useEffect(() => {
    setCurrentRole(mode);
    setActiveTab(initialTab);
    setLoginForm(customerLoginDefaults);
    setRegisterForm(customerRegisterDefaults);
    resetFeedback();
    if (initialNotice) {
      setNotice(initialNotice);
    }
  }, [initialTab, mode, initialNotice]);

  const resetFeedback = () => {
    setNotice('');
    setErrors({});
  };

  const inputClass = 'w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-slate-600 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20';

  const handleCustomerRegister = async (event) => {
    event.preventDefault();
    setLoading(true);
    resetFeedback();

    const nextErrors = validateRegistrationFields(registerForm);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setLoading(false);
      triggerShake();
      return;
    }

    const result = await registerCustomer(registerForm);
    if (!result.ok) {
      setErrors(result.errors || {});
      setNotice(result.error || 'Registration failed.');
      setLoading(false);
      triggerShake();
      return;
    }

    setVerificationEmail(result.email);
    setVerificationCode(result.verificationCode);
    setVerificationInput('');
    setNotice(getVerificationNotice(result.email, result.verificationCode));
    setActiveTab('verify');
    setLoading(false);
    onRegisterSuccess?.({ email: result.email, code: result.verificationCode });
  };

  const handleVerificationSubmit = async (event) => {
    event.preventDefault();
    resetFeedback();

    const codeError = validateVerificationCode(verificationInput);
    if (codeError) {
      setErrors({ verificationInput: codeError });
      triggerShake();
      return;
    }

    setLoading(true);
    const result = await verifyCustomerEmail({ email: verificationEmail, code: verificationInput });
    setLoading(false);

    if (!result.ok) {
      setErrors({ verificationInput: result.error });
      triggerShake();
      return;
    }

    setNotice(result.message || 'Email verified successfully.');
    setActiveTab('login');
    setLoginForm((current) => ({ ...current, email: verificationEmail }));
  };

  const handleResendCode = async () => {
    const targetEmail = verificationEmail || registerForm.email || loginForm.email;
    if (!targetEmail) return;

    setLoading(true);
    const result = await resendVerificationCode(targetEmail);
    setLoading(false);

    if (!result.ok) {
      setNotice(result.error);
      return;
    }

    if (result.verificationCode) {
      setVerificationCode(result.verificationCode);
      setNotice(getVerificationNotice(targetEmail, result.verificationCode));
      onRegisterSuccess?.({ email: targetEmail, code: result.verificationCode });
    } else {
      setNotice(result.message);
    }
  };

  const handleCustomerLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    resetFeedback();

    const nextErrors = validateLoginFields(loginForm);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setLoading(false);
      triggerShake();
      return;
    }

    if (lockoutTimeLeft > 0) {
      setNotice(`Account is temporarily locked. Try again in ${formatLockoutTime(lockoutTimeLeft)}.`);
      setLoading(false);
      triggerShake();
      return;
    }

    const result = await loginCustomer(loginForm);
    if (!result.ok) {
      setErrors(result.errors || {});
      setNotice(result.error || 'Login failed.');
      triggerShake();

      if (result.locked) {
        setLockoutTimeLeft(15 * 60); // 15 min lock
      }

      if (result.needsVerification) {
        setVerificationEmail(loginForm.email);
        setActiveTab('verify');
      }

      setLoading(false);
      return;
    }

    onCustomerAuthenticated(result.session);
    setNotice('Customer login successful.');
    setLoading(false);
  };

  const handleForgotRequest = async (e) => {
    e.preventDefault();
    resetFeedback();
    if (!forgotEmail) {
      setErrors({ forgotEmail: 'Email is required' });
      return;
    }
    setLoading(true);
    const result = await requestPasswordReset(forgotEmail);
    setLoading(false);
    if (!result.ok) {
      setNotice(result.error);
      return;
    }
    setNotice(result.message + (result.resetToken ? ` (Demo token: ${result.resetToken})` : ''));
    if (result.resetToken) setForgotToken(result.resetToken);
    setForgotStep(2);
  };

  const handleForgotReset = async (e) => {
    e.preventDefault();
    resetFeedback();
    if (!forgotToken || !forgotNewPassword) {
      setErrors({ form: 'All fields are required.' });
      return;
    }
    if (forgotNewPassword.length < 8) {
      setErrors({ newPassword: 'Password must be at least 8 characters.' });
      return;
    }
    setLoading(true);
    const result = await resetPassword({ token: forgotToken, password: forgotNewPassword });
    setLoading(false);
    if (!result.ok) {
      setNotice(result.error);
      return;
    }
    setNotice('Password updated successfully. You can now log in.');
    setForgotStep(1);
    setForgotEmail('');
    setForgotToken('');
    setForgotNewPassword('');
    setActiveTab('login');
  };

  const handleAdminLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    resetFeedback();

    const nextErrors = validateLoginFields(loginForm);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setLoading(false);
      triggerShake();
      return;
    }

    if (lockoutTimeLeft > 0) {
      setNotice(`Admin portal is temporarily locked. Try again in ${formatLockoutTime(lockoutTimeLeft)}.`);
      setLoading(false);
      triggerShake();
      return;
    }

    const result = await loginAdmin(loginForm);
    if (!result.ok) {
      setErrors(result.errors || {});
      setNotice(result.error || 'Admin login failed.');
      triggerShake();

      if (result.locked) {
        setLockoutTimeLeft(15 * 60); // 15 min lock
      }

      setLoading(false);
      return;
    }

    onAdminAuthenticated(result.session);
    setNotice('Admin login successful.');
    setLoading(false);
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
              <span className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.28em] text-red-600 dark:text-red-300">
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
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
                {isCustomerMode ? 'Customer account' : 'Admin sign-in'}
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {isCustomerMode ? (activeTab === 'register' ? 'Create your account' : activeTab === 'verify' ? 'Verify your email' : activeTab === 'forgot' ? 'Reset password' : 'Customer login') : 'Admin login'}
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
                    setActiveTab('verify');
                    resetFeedback();
                  }}
                  className={`flex-1 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${activeTab === 'verify' ? 'bg-secondary text-foreground border border-border' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Verify
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('forgot');
                    setForgotStep(1);
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
              <form onSubmit={handleCustomerRegister} className={`space-y-4 ${shake && activeTab === 'register' ? 'animate-shake' : ''}`}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">Full name</label>
                    <input
                      className={`${inputClass} ${errors.fullName ? 'border-red-500 ring-2 ring-red-500/20 focus:border-red-500' : ''}`}
                      value={registerForm.fullName}
                      onChange={(event) => setRegisterForm((current) => ({ ...current, fullName: event.target.value }))}
                      placeholder="Juan Dela Cruz"
                    />
                    {errors.fullName && <p className="text-xs text-red-400 font-semibold">{errors.fullName}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">Contact number</label>
                    <input
                      className={`${inputClass} ${errors.contactNumber ? 'border-red-500 ring-2 ring-red-500/20 focus:border-red-500' : ''}`}
                      value={registerForm.contactNumber}
                      onChange={(event) => setRegisterForm((current) => ({ ...current, contactNumber: event.target.value }))}
                      placeholder="09171234567"
                    />
                    {errors.contactNumber && <p className="text-xs text-red-400 font-semibold">{errors.contactNumber}</p>}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">Email</label>
                    <input
                      type="email"
                      className={`${inputClass} ${errors.email ? 'border-red-500 ring-2 ring-red-500/20 focus:border-red-500' : ''}`}
                      value={registerForm.email}
                      onChange={(event) => setRegisterForm((current) => ({ ...current, email: event.target.value }))}
                      placeholder="customer@domain.com"
                    />
                    {errors.email && <p className="text-xs text-red-400 font-semibold">{errors.email}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">Password</label>
                    <input
                      type="password"
                      className={`${inputClass} ${errors.password ? 'border-red-500 ring-2 ring-red-500/20 focus:border-red-500' : ''}`}
                      value={registerForm.password}
                      onChange={(event) => setRegisterForm((current) => ({ ...current, password: event.target.value }))}
                      placeholder="Minimum 8 characters"
                    />
                    {errors.password && <p className="text-xs text-red-400 font-semibold">{errors.password}</p>}
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

             {isCustomerMode && activeTab === 'verify' && (
              <form onSubmit={handleVerificationSubmit} className={`space-y-4 ${shake && activeTab === 'verify' ? 'animate-shake' : ''}`}>
                <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4 text-sm text-sky-800 dark:text-sky-300">
                  Email verification is required before login. The code is sent to the address used during registration.
                </div>

                {verificationCode && (
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                    Demo verification code: <span className="font-bold tracking-[0.25em]">{verificationCode}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">Verification code</label>
                  <input
                    className={`${inputClass} ${errors.verificationInput ? 'border-red-500 ring-2 ring-red-500/20 focus:border-red-500' : ''}`}
                    value={verificationInput}
                    onChange={(event) => setVerificationInput(event.target.value)}
                    placeholder="6-digit code"
                  />
                  {errors.verificationInput && <p className="text-xs text-red-400 font-semibold">{errors.verificationInput}</p>}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="submit"
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3.5 text-sm font-bold text-white transition hover:bg-accent/90"
                  >
                    <EnvelopeOpen weight="duotone" className="h-4 w-4" />
                    Verify email
                  </button>
                  <button
                    type="button"
                    onClick={handleResendCode}
                    className="rounded-xl border border-border px-4 py-3.5 text-sm font-semibold text-foreground transition hover:border-border hover:bg-background"
                  >
                    Resend code
                  </button>
                </div>
              </form>
            )}

             {isCustomerMode && activeTab === 'login' && (
              <form onSubmit={handleCustomerLogin} className={`space-y-4 ${shake && activeTab === 'login' ? 'animate-shake' : ''}`}>
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
                        className={`${inputClass} ${errors.email ? 'border-red-500 ring-2 ring-red-500/20 focus:border-red-500' : ''}`}
                        value={loginForm.email}
                        onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
                        placeholder="customer@domain.com"
                      />
                      {errors.email && <p className="text-xs text-red-400 font-semibold">{errors.email}</p>}
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">Password</label>
                      <input
                        type="password"
                        className={`${inputClass} ${errors.password ? 'border-red-500 ring-2 ring-red-500/20 focus:border-red-500' : ''}`}
                        value={loginForm.password}
                        onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                        placeholder="Enter your password"
                      />
                      {errors.password && <p className="text-xs text-red-400 font-semibold">{errors.password}</p>}
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground w-full cursor-pointer">
                        <input
                          type="checkbox"
                          checked={loginForm.rememberMe}
                          onChange={(event) => setLoginForm((current) => ({ ...current, rememberMe: event.target.checked }))}
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
                          setForgotStep(1);
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
                {forgotStep === 1 ? (
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
                ) : (
                  <form onSubmit={handleForgotReset} className={`space-y-4 ${shake && activeTab === 'forgot' ? 'animate-shake' : ''}`}>
                     <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4 text-sm text-sky-800 dark:text-sky-300">
                      Enter the reset token you received and your new password.
                    </div>
                    {errors.form && <p className="text-xs text-red-400 font-semibold">{errors.form}</p>}
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">Reset Token</label>
                      <input
                        type="text"
                        className={inputClass}
                        value={forgotToken}
                        onChange={(e) => setForgotToken(e.target.value)}
                        placeholder="Paste your reset token here"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">New Password</label>
                      <input
                        type="password"
                        className={`${inputClass} ${errors.newPassword ? 'border-red-500 ring-2 ring-red-500/20 focus:border-red-500' : ''}`}
                        value={forgotNewPassword}
                        onChange={(e) => setForgotNewPassword(e.target.value)}
                        placeholder="Minimum 8 characters"
                      />
                      {errors.newPassword && <p className="text-xs text-red-400 font-semibold">{errors.newPassword}</p>}
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3.5 text-sm font-bold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {loading ? <CircleNotch weight="duotone" className="h-4 w-4 animate-spin" /> : <CheckCircle weight="duotone" className="h-4 w-4" />}
                      Reset Password
                    </button>
                  </form>
                )}
              </div>
            )}

             {!isCustomerMode && (
              <form onSubmit={handleAdminLogin} className={`space-y-4 ${shake && !isCustomerMode ? 'animate-shake' : ''}`}>
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
                        className={`${inputClass} ${errors.email ? 'border-red-500 ring-2 ring-red-500/20 focus:border-red-500' : ''}`}
                        value={loginForm.email}
                        onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
                        placeholder="admin@tarlactruckparts.local"
                      />
                      {errors.email && <p className="text-xs text-red-400 font-semibold">{errors.email}</p>}
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">Password</label>
                      <input
                        type="password"
                        className={`${inputClass} ${errors.password ? 'border-red-500 ring-2 ring-red-500/20 focus:border-red-500' : ''}`}
                        value={loginForm.password}
                        onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                        placeholder="Enter admin password"
                      />
                      {errors.password && <p className="text-xs text-red-400 font-semibold">{errors.password}</p>}
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3.5 text-sm font-bold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {loading ? <CircleNotch weight="duotone" className="h-4 w-4 animate-spin" /> : <ShieldCheck weight="duotone" className="h-4 w-4" />}
                      Enter admin login
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
