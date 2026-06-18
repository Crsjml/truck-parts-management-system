import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Lock, LoaderCircle, MailCheck, ShieldCheck } from 'lucide-react';
import Logo from './Logo';
import {
  getVerificationNotice,
  loginAdmin,
  loginCustomer,
  registerCustomer,
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
  const isCustomerMode = mode === 'customer';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [registerForm, setRegisterForm] = useState(customerRegisterDefaults);
  const [loginForm, setLoginForm] = useState(customerLoginDefaults);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationInput, setVerificationInput] = useState('');
  const [notice, setNotice] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, mode]);

  const resetFeedback = () => {
    setNotice('');
    setErrors({});
  };

  const inputClass = 'w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20';

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

  const handleVerificationSubmit = (event) => {
    event.preventDefault();
    resetFeedback();

    const codeError = validateVerificationCode(verificationInput);
    if (codeError) {
      setErrors({ verificationInput: codeError });
      return;
    }

    const result = verifyCustomerEmail({ email: verificationEmail, code: verificationInput });
    if (!result.ok) {
      setErrors({ verificationInput: result.error });
      return;
    }

    setNotice(result.message || 'Email verified successfully.');
    setActiveTab('login');
    setLoginForm((current) => ({ ...current, email: verificationEmail }));
  };

  const handleResendCode = () => {
    const targetEmail = verificationEmail || registerForm.email || loginForm.email;
    if (!targetEmail) return;

    const result = resendVerificationCode(targetEmail);
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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col lg:flex-row">
        <section className="relative flex w-full flex-col justify-between overflow-hidden border-b border-slate-900/80 bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.18),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(37,99,235,0.18),_transparent_28%),linear-gradient(160deg,_rgba(15,23,42,0.98),_rgba(2,6,23,1))] px-6 py-8 lg:min-h-screen lg:w-[44%] lg:border-b-0 lg:border-r lg:px-10 lg:py-10">
          <div className="relative space-y-8">
            <button
              type="button"
              onClick={onBackToStore}
              className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-300 transition hover:border-slate-700 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to store
            </button>

            <Logo className="w-16 h-16" showText={true} />

            <div className="max-w-xl space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.28em] text-red-300">
                {isCustomerMode ? 'Customer Access' : 'Admin Portal'}
              </span>
              <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                {isCustomerMode ? 'A retail catalog built for truck parts buyers.' : 'Secure admin access for inventory control.'}
              </h1>
              <p className="max-w-lg text-sm leading-6 text-slate-300 sm:text-base">
                {isCustomerMode
                  ? 'Browse the catalog like a modern e-commerce storefront, register an account, verify your email, and keep your login active with remember-me.'
                  : 'Admin credentials stay out of public registration. Login happens through this dedicated portal with lockout protection after repeated failures.'}
              </p>
            </div>
          </div>

          <div className="relative grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Catalog', value: 'Retail style' },
              { label: 'Auth', value: 'Mock JWT' },
              { label: 'Security', value: 'Lockout ready' }
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/8 bg-white/5 p-4 backdrop-blur">
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-slate-500">{item.label}</p>
                <p className="mt-2 text-sm font-semibold text-slate-100">{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex w-full items-center justify-center px-4 py-8 sm:px-6 lg:w-[56%] lg:px-10 lg:py-10">
          <div className="w-full max-w-2xl rounded-[2rem] border border-slate-800/80 bg-slate-900/80 p-5 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
            <div className="mb-6 flex items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-slate-500">{isCustomerMode ? 'Customer account' : 'Admin sign-in'}</p>
                <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                  {isCustomerMode ? (activeTab === 'register' ? 'Create your account' : activeTab === 'verify' ? 'Verify your email' : 'Customer login') : 'Admin login'}
                </h2>
              </div>

              {!isCustomerMode && (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-right text-[11px] font-semibold text-emerald-300">
                  Separate portal
                </div>
              )}
            </div>

            {isCustomerMode && (
              <div className="mb-6 flex rounded-2xl border border-slate-800 bg-slate-950/60 p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('login')}
                  className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition ${activeTab === 'login' ? 'bg-accent text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('register')}
                  className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition ${activeTab === 'register' ? 'bg-accent text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Register
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('verify')}
                  className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition ${activeTab === 'verify' ? 'bg-accent text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Verify
                </button>
              </div>
            )}

            {notice && (
              <div className="mb-5 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
                {notice}
              </div>
            )}

            {isCustomerMode && activeTab === 'register' && (
              <form onSubmit={handleCustomerRegister} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Full name</label>
                    <input
                      className={inputClass}
                      value={registerForm.fullName}
                      onChange={(event) => setRegisterForm((current) => ({ ...current, fullName: event.target.value }))}
                      placeholder="Juan Dela Cruz"
                    />
                    {errors.fullName && <p className="text-xs text-red-400">{errors.fullName}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Contact number</label>
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
                    <label className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Email</label>
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
                    <label className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Password</label>
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
                  {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
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
                  <label className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Verification code</label>
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
                    <MailCheck className="h-4 w-4" />
                    Verify email
                  </button>
                  <button
                    type="button"
                    onClick={handleResendCode}
                    className="rounded-xl border border-slate-800 px-4 py-3.5 text-sm font-semibold text-slate-200 transition hover:border-slate-700 hover:bg-slate-950/60"
                  >
                    Resend code
                  </button>
                </div>
              </form>
            )}

            {isCustomerMode && activeTab === 'login' && (
              <form onSubmit={handleCustomerLogin} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Email</label>
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
                  <label className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Password</label>
                  <input
                    type="password"
                    className={inputClass}
                    value={loginForm.password}
                    onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                    placeholder="Enter your password"
                  />
                  {errors.password && <p className="text-xs text-red-400">{errors.password}</p>}
                </div>

                <label className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={loginForm.rememberMe}
                    onChange={(event) => setLoginForm((current) => ({ ...current, rememberMe: event.target.checked }))}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-accent focus:ring-accent"
                  />
                  Remember me on this device
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3.5 text-sm font-bold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  Sign in
                </button>
              </form>
            )}

            {!isCustomerMode && (
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                  Admin accounts are not publicly registered. Use this separate portal for privileged access.
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Admin email</label>
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
                  <label className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Password</label>
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
                  {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  Enter admin portal
                </button>
              </form>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
