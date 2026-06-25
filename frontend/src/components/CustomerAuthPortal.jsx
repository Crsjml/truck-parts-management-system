import React, { useState } from 'react';
import { ArrowLeft, CheckCircle, Truck, Percent, User, Eye, EyeSlash, CircleNotch } from '@phosphor-icons/react';
import { loginCustomer, registerCustomer } from '../authStore';
import Logo from './Logo';
import Footer from './Footer';

export default function CustomerAuthPortal({
  initialTab = 'login',
  onBackToStore,
  onCustomerLoginSuccess,
  onRegisterSuccess,
}) {
  const [activeTab, setActiveTab] = useState(initialTab);

  return (
    <div className="h-screen w-full flex bg-background font-sans overflow-hidden fixed inset-0 z-50 animate-[fadeIn_0.2s_ease-out]">
      {/* ── Left Branding Column (Desktop) ── */}
      <div className="w-1/2 lg:flex flex-col justify-between hidden p-14 relative overflow-hidden bg-brand/5">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand/10 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3"></div>
        <div className="relative z-10 flex items-center justify-between w-full">
          <Logo className="w-16 h-16" showText={true} />
          <div className="flex items-center gap-2 px-4 py-2 bg-background/60 backdrop-blur-md rounded-full shadow-sm border border-border/50 text-sm font-semibold text-brand">
            <User weight="fill" className="w-4 h-4" />
            Customer Portal
          </div>
        </div>
        <div className="relative z-10 max-w-lg">
          <h1 className="text-5xl font-extrabold text-foreground tracking-tight leading-[1.1] mb-6">
            Tarlac's Premium Truck Parts Hub.
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed mb-10 font-medium">
            Access exclusive pricing, track your orders instantly, and manage your fleet inventory from anywhere.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 bg-background/50 backdrop-blur-md p-4 rounded-2xl border border-border/50">
              <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand">
                <CheckCircle weight="fill" className="w-5 h-5" />
              </div>
              <span className="font-semibold text-sm">Genuine Parts</span>
            </div>
            <div className="flex items-center gap-3 bg-background/50 backdrop-blur-md p-4 rounded-2xl border border-border/50">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <Percent weight="bold" className="w-5 h-5" />
              </div>
              <span className="font-semibold text-sm">Trade Discounts</span>
            </div>
            <div className="flex items-center gap-3 bg-background/50 backdrop-blur-md p-4 rounded-2xl border border-border/50 col-span-2">
              <div className="w-10 h-10 rounded-full bg-sky-500/10 flex items-center justify-center text-sky-600">
                <Truck weight="fill" className="w-5 h-5" />
              </div>
              <span className="font-semibold text-sm">Priority Fulfillment & Pickup</span>
            </div>
          </div>
        </div>
        <div className="relative z-10">
          <Footer variant="simple" />
        </div>
      </div>

      {/* ── Right Auth Column ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-14 bg-background relative">
        <button
          onClick={onBackToStore}
          className="absolute top-6 left-6 lg:top-10 lg:left-10 flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors group z-20 bg-secondary/80 backdrop-blur-sm px-4 py-2 rounded-full lg:bg-transparent lg:px-0 lg:py-0"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" weight="bold" />
          Back to Store
        </button>

        <div className="w-full max-w-md mx-auto relative z-10 animate-[scaleUp_0.3s_cubic-bezier(0.34,1.56,0.64,1)]">
          <div className="mb-8 lg:hidden flex justify-center mt-12">
            <Logo className="w-16 h-16" showText={true} />
          </div>

          <div className="flex justify-center w-full min-h-[500px]">
            {activeTab === 'login' ? (
              <CustomerLoginForm
                onSuccess={onCustomerLoginSuccess}
                onRegisterLink={() => setActiveTab('register')}
              />
            ) : (
              <CustomerRegisterForm
                onSuccess={onRegisterSuccess}
                onLoginLink={() => setActiveTab('login')}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Customer Login Form ─────────────────────────────────────────────────── */

function CustomerLoginForm({ onSuccess, onRegisterLink }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setLoading(true);

    try {
      const result = await loginCustomer({ email, password, rememberMe });

      if (!result.ok) {
        if (result.errors) {
          setFieldErrors(result.errors);
        } else {
          setError(result.error || 'Login failed.');
        }
        setLoading(false);
        return;
      }

      if (onSuccess) onSuccess(result.session);
    } catch {
      setError('Could not reach the backend server. Is it running?');
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand/10 mb-4 text-brand">
          <User weight="fill" className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Customer Sign In</h2>
        <p className="text-sm text-muted-foreground mt-1 font-medium">Access your personal storefront and orders</p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-sm font-medium text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="customer-email" className="block text-sm font-semibold text-foreground mb-1.5">
            Email address
          </label>
          <input
            id="customer-email"
            type="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="lionel.messi@example.com"
            className={`w-full px-4 py-3 rounded-xl border bg-secondary/50 text-foreground placeholder:text-muted-foreground/50 outline-none transition-all focus:ring-2 focus:ring-brand/30 focus:border-brand ${
              fieldErrors.email ? 'border-red-500' : 'border-border'
            }`}
          />
          {fieldErrors.email && (
            <p className="mt-1 text-xs text-red-500">{fieldErrors.email}</p>
          )}
        </div>

        <div>
          <label htmlFor="customer-password" className="block text-sm font-semibold text-foreground mb-1.5">
            Password
          </label>
          <div className="relative">
            <input
              id="customer-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={`w-full px-4 py-3 rounded-xl border bg-secondary/50 text-foreground placeholder:text-muted-foreground/50 outline-none transition-all focus:ring-2 focus:ring-brand/30 focus:border-brand pr-12 ${
                fieldErrors.password ? 'border-red-500' : 'border-border'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeSlash className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {fieldErrors.password && (
            <p className="mt-1 text-xs text-red-500">{fieldErrors.password}</p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="rounded border-border text-brand focus:ring-brand"
            />
            Remember me
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-brand text-white font-semibold text-sm transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <CircleNotch className="w-5 h-5 animate-spin" />
              Signing in…
            </>
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground text-center font-medium">
        Don't have an account?{' '}
        <button onClick={onRegisterLink} className="text-brand font-semibold hover:underline">
          Sign up here
        </button>
      </p>
    </div>
  );
}

/* ── Customer Register Form ──────────────────────────────────────────────── */

function CustomerRegisterForm({ onSuccess, onLoginLink }) {
  const [fullName, setFullName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setLoading(true);

    try {
      const result = await registerCustomer({ fullName, contactNumber, email, password });

      if (!result.ok) {
        if (result.errors) {
          setFieldErrors(result.errors);
        } else {
          setError(result.error || 'Registration failed.');
        }
        setLoading(false);
        return;
      }

      setLoading(false);
      // Trigger simulation notification and go to verification / login
      if (onSuccess) onSuccess({ email: result.email, code: result.verificationCode });
      onLoginLink();
    } catch {
      setError('Could not reach the backend server. Is it running?');
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm overflow-y-auto max-h-[90vh] pr-2 custom-scrollbar">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand/10 mb-3 text-brand">
          <User weight="fill" className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Create Customer Account</h2>
        <p className="text-xs text-muted-foreground mt-1 font-medium">Join us for priority pickup and trade discounts</p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-sm font-medium text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="reg-fullname" className="block text-xs font-semibold text-foreground mb-1">
            Full Name
          </label>
          <input
            id="reg-fullname"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Lionel Messi"
            className={`w-full px-3 py-2 text-sm rounded-xl border bg-secondary/50 text-foreground placeholder:text-muted-foreground/50 outline-none transition-all focus:ring-2 focus:ring-brand/30 focus:border-brand ${
              fieldErrors.fullName ? 'border-red-500' : 'border-border'
            }`}
          />
          {fieldErrors.fullName && (
            <p className="mt-0.5 text-xs text-red-500">{fieldErrors.fullName}</p>
          )}
        </div>

        <div>
          <label htmlFor="reg-contact" className="block text-xs font-semibold text-foreground mb-1">
            Contact Number
          </label>
          <input
            id="reg-contact"
            type="text"
            required
            value={contactNumber}
            onChange={(e) => setContactNumber(e.target.value)}
            placeholder="+5491112345678"
            className={`w-full px-3 py-2 text-sm rounded-xl border bg-secondary/50 text-foreground placeholder:text-muted-foreground/50 outline-none transition-all focus:ring-2 focus:ring-brand/30 focus:border-brand ${
              fieldErrors.contactNumber ? 'border-red-500' : 'border-border'
            }`}
          />
          {fieldErrors.contactNumber && (
            <p className="mt-0.5 text-xs text-red-500">{fieldErrors.contactNumber}</p>
          )}
        </div>

        <div>
          <label htmlFor="reg-email" className="block text-xs font-semibold text-foreground mb-1">
            Email address
          </label>
          <input
            id="reg-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="lionel.messi@example.com"
            className={`w-full px-3 py-2 text-sm rounded-xl border bg-secondary/50 text-foreground placeholder:text-muted-foreground/50 outline-none transition-all focus:ring-2 focus:ring-brand/30 focus:border-brand ${
              fieldErrors.email ? 'border-red-500' : 'border-border'
            }`}
          />
          {fieldErrors.email && (
            <p className="mt-0.5 text-xs text-red-500">{fieldErrors.email}</p>
          )}
        </div>

        <div>
          <label htmlFor="reg-password" className="block text-xs font-semibold text-foreground mb-1">
            Password
          </label>
          <div className="relative">
            <input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={`w-full px-3 py-2 text-sm rounded-xl border bg-secondary/50 text-foreground placeholder:text-muted-foreground/50 outline-none transition-all focus:ring-2 focus:ring-brand/30 focus:border-brand pr-10 ${
                fieldErrors.password ? 'border-red-500' : 'border-border'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {fieldErrors.password && (
            <p className="mt-0.5 text-xs text-red-500">{fieldErrors.password}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 mt-2 rounded-xl bg-brand text-white font-semibold text-sm transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <CircleNotch className="w-4 h-4 animate-spin" />
              Creating Account…
            </>
          ) : (
            'Register'
          )}
        </button>
      </form>

      <p className="mt-4 text-sm text-muted-foreground text-center font-medium">
        Already have an account?  
        <button onClick={onLoginLink} className="text-brand font-semibold hover:underline">
          Sign in here
        </button>
      </p>
    </div>
  );
}
