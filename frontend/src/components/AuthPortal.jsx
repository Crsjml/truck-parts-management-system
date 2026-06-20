import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle, LockKey, CircleNotch, EnvelopeOpen, ShieldCheck, Truck, Percent, User } from '@phosphor-icons/react';
import Logo from './Logo';
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
  onBackToStore,
  onCustomerAuthenticated,
  onAdminAuthenticated
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

  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotToken, setForgotToken] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotStep, setForgotStep] = useState(1);

  useEffect(() => {
    setCurrentRole(mode);
    setActiveTab(initialTab);
  }, [initialTab, mode]);

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
      return;
    }

    const result = await registerCustomer(registerForm);
    if (!result.ok) {
      setErrors(result.errors || {});
      setNotice(result.error || 'Registration failed.');
      setLoading(false);
      return;
    }

    setVerificationEmail(result.email);
    setVerificationCode(result.verificationCode);
    setVerificationInput('');
    setNotice(getVerificationNotice(result.email, result.verificationCode));
    setActiveTab('verify');
    setLoading(false);
  };

  const handleVerificationSubmit = async (event) => {
    event.preventDefault();
    resetFeedback();

    const codeError = validateVerificationCode(verificationInput);
    if (codeError) {
      setErrors({ verificationInput: codeError });
      return;
    }

    setLoading(true);
    const result = await verifyCustomerEmail({ email: verificationEmail, code: verificationInput });
    setLoading(false);

    if (!result.ok) {
      setErrors({ verificationInput: result.error });
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
      return;
    }

    const result = await loginCustomer(loginForm);
    if (!result.ok) {
      setErrors(result.errors || {});
      setNotice(result.error || 'Login failed.');

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
      return;
    }

    const result = await loginAdmin(loginForm);
    if (!result.ok) {
      setErrors(result.errors || {});
      setNotice(result.error || 'Admin login failed.');
      setLoading(false);
      return;
    }

    onAdminAuthenticated(result.session);
    setNotice('Admin login successful.');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col lg:flex-row">
        <section className="relative flex w-full flex-col justify-between overflow-hidden border-b border-slate-900/80 bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.18),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(37,99,235,0.18),_transparent_28%),linear-gradient(160deg,_rgba(15,23,42,0.98),_rgba(2,6,23,1))] px-6 py-8 lg:min-h-screen lg:w-[44%] lg:border-b-0 lg:border-r lg:px-10 lg:py-10">
          <div className="relative space-y-8">
            <button
              type="button"
              onClick={onBackToStore}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground transition hover:border-border hover:text-foreground"
            >
              <ArrowLeft weight="duotone" className="h-4 w-4" />
              Back to store
            </button>

            <Logo className="w-16 h-16" showText={true} />

            <div className="max-w-xl space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.28em] text-red-300">
                Premium Truck Spare Parts
              </span>
              <h1 className="text-4xl font-black tracking-tight text-foreground sm:text-5xl">
                Tarlac Truck Parts
              </h1>
              <p className="max-w-lg text-sm leading-6 text-muted-foreground sm:text-base">
                We specialize in sourcing and distributing premium grade, heavy-duty truck accessories and spare components. Offering wholesale and retail solutions across Tarlac City and regional logistics networks.
              </p>
            </div>
          </div>

          <div className="relative space-y-4 my-8 lg:my-0">
            <div className="flex gap-4 p-4 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md">
              <div className="p-2.5 bg-brandBlue-900/30 border border-brandBlue-800/30 text-brandBlue-400 rounded-xl h-10 w-10 shrink-0 flex items-center justify-center">
                <Truck weight="duotone" className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-foreground text-sm">Wide Compatibility</h4>
                <p className="text-xs text-muted-foreground mt-1">Tailored replacement components for Isuzu, Hino, Fuso, and Toyota Dyna models.</p>
              </div>
            </div>

            <div className="flex gap-4 p-4 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md">
              <div className="p-2.5 bg-emerald-950/40 border border-emerald-800/30 text-emerald-400 rounded-xl h-10 w-10 shrink-0 flex items-center justify-center">
                <Percent weight="duotone" className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-foreground text-sm">VIP Wholesale Pricing</h4>
                <p className="text-xs text-muted-foreground mt-1">Bulk volume deductibles and quotation rates directly mapped for freight operators.</p>
              </div>
            </div>

            <div className="flex gap-4 p-4 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md">
              <div className="p-2.5 bg-secondary border border-border text-muted-foreground rounded-xl h-10 w-10 shrink-0 flex items-center justify-center">
                <ShieldCheck weight="duotone" className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-foreground text-sm">OEM Certified Sourcing</h4>
                <p className="text-xs text-muted-foreground mt-1">All inventory matches exact manufacturer OEM specifications to guarantee reliability.</p>
              </div>
            </div>
          </div>

          <div className="relative text-xs text-muted-foreground font-semibold pt-4 border-t border-slate-900/60 flex items-center gap-2">
            <span>© 2026 Tarlac Truck Parts.</span>
          </div>
        </section>

        <section className="flex w-full items-center justify-center px-4 py-8 sm:px-6 lg:w-[56%] lg:px-10 lg:py-10">
          <div className="w-full max-w-2xl rounded-[2rem] border border-border bg-secondary p-5 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
            <div className="mb-6 flex items-center justify-between gap-4 border-b border-border pb-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground">{isCustomerMode ? 'Customer account' : 'Admin sign-in'}</p>
                <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                  {isCustomerMode ? (activeTab === 'register' ? 'Create your account' : activeTab === 'verify' ? 'Verify your email' : activeTab === 'forgot' ? 'Reset password' : 'Customer login') : 'Admin login'}
                </h2>
              </div>
            </div>

            {/* Role Switcher */}
            <div className="mb-6 flex rounded-2xl border border-border bg-background p-1">
              <button
                type="button"
                onClick={() => {
                  setCurrentRole('customer');
                  setActiveTab('login');
                  resetFeedback();
                }}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${isCustomerMode ? 'bg-accent text-white font-bold' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <User weight="duotone" className="w-4.5 h-4.5" />
                Customer Access
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrentRole('admin');
                  setActiveTab('login');
                  resetFeedback();
                }}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${!isCustomerMode ? 'bg-accent text-white font-bold' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <ShieldCheck weight="duotone" className="w-4.5 h-4.5" />
                Admin login
              </button>
            </div>

            {isCustomerMode && (
              <div className="mb-6 flex rounded-2xl border border-border bg-background p-1">
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

            {notice && (
              <div className="mb-5 rounded-2xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
                {notice}
              </div>
            )}

            {isCustomerMode && activeTab === 'register' && (
              <form onSubmit={handleCustomerRegister} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">Full name</label>
                    <input
                      className={inputClass}
                      value={registerForm.fullName}
                      onChange={(event) => setRegisterForm((current) => ({ ...current, fullName: event.target.value }))}
                      placeholder="Juan Dela Cruz"
                    />
                    {errors.fullName && <p className="text-xs text-red-400">{errors.fullName}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">Contact number</label>
                    <input
                      className={inputClass}
                      value={registerForm.contactNumber}
                      onChange={(event) => setRegisterForm((current) => ({ ...current, contactNumber: event.target.value }))}
                      placeholder="09171234567"
                    />
                    {errors.contactNumber && <p className="text-xs text-red-400">{errors.contactNumber}</p>}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">Email</label>
                    <input
                      type="email"
                      className={inputClass}
                      value={registerForm.email}
                      onChange={(event) => setRegisterForm((current) => ({ ...current, email: event.target.value }))}
                      placeholder="customer@domain.com"
                    />
                    {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">Password</label>
                    <input
                      type="password"
                      className={inputClass}
                      value={registerForm.password}
                      onChange={(event) => setRegisterForm((current) => ({ ...current, password: event.target.value }))}
                      placeholder="Minimum 8 characters"
                    />
                    {errors.password && <p className="text-xs text-red-400">{errors.password}</p>}
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
              <form onSubmit={handleVerificationSubmit} className="space-y-4">
                <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4 text-sm text-sky-100">
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
                    className={inputClass}
                    value={verificationInput}
                    onChange={(event) => setVerificationInput(event.target.value)}
                    placeholder="6-digit code"
                  />
                  {errors.verificationInput && <p className="text-xs text-red-400">{errors.verificationInput}</p>}
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
              <form onSubmit={handleCustomerLogin} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">Email</label>
                  <input
                    type="email"
                    className={inputClass}
                    value={loginForm.email}
                    onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder="customer@domain.com"
                  />
                  {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">Password</label>
                  <input
                    type="password"
                    className={inputClass}
                    value={loginForm.password}
                    onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                    placeholder="Enter your password"
                  />
                  {errors.password && <p className="text-xs text-red-400">{errors.password}</p>}
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground w-full">
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
              </form>
            )}

            {isCustomerMode && activeTab === 'forgot' && (
              <div className="space-y-4">
                {forgotStep === 1 ? (
                  <form onSubmit={handleForgotRequest} className="space-y-4">
                    <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4 text-sm text-sky-100">
                      Enter your email to request a password reset link.
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">Email</label>
                      <input
                        type="email"
                        className={inputClass}
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="customer@domain.com"
                      />
                      {errors.forgotEmail && <p className="text-xs text-red-400">{errors.forgotEmail}</p>}
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
                  <form onSubmit={handleForgotReset} className="space-y-4">
                     <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4 text-sm text-sky-100">
                      Enter the reset token you received and your new password.
                    </div>
                    {errors.form && <p className="text-xs text-red-400">{errors.form}</p>}
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
                        className={inputClass}
                        value={forgotNewPassword}
                        onChange={(e) => setForgotNewPassword(e.target.value)}
                        placeholder="Minimum 8 characters"
                      />
                      {errors.newPassword && <p className="text-xs text-red-400">{errors.newPassword}</p>}
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
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                  Admin accounts are not publicly registered. Use this separate portal for privileged access.
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">Admin email</label>
                  <input
                    type="email"
                    className={inputClass}
                    value={loginForm.email}
                    onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder="admin@tarlactruckparts.local"
                  />
                  {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">Password</label>
                  <input
                    type="password"
                    className={inputClass}
                    value={loginForm.password}
                    onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                    placeholder="Enter admin password"
                  />
                  {errors.password && <p className="text-xs text-red-400">{errors.password}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3.5 text-sm font-bold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? <CircleNotch weight="duotone" className="h-4 w-4 animate-spin" /> : <ShieldCheck weight="duotone" className="h-4 w-4" />}
                  Enter admin login
                </button>
              </form>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
