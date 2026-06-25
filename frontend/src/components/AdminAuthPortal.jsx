import React, { useState } from 'react';
import { ArrowLeft, ShieldCheck, Eye, EyeSlash, CircleNotch, Lock, Buildings } from '@phosphor-icons/react';
import { loginAdmin } from '../authStore';
import Logo from './Logo';
import Footer from './Footer';

// AdminAuthPortal - Admin-only login portal using custom JWT auth.
// Customer authentication is handled separately by CustomerAuthPortal.
export default function AdminAuthPortal({
  onBackToStore,
  onAdminLoginSuccess,
}) {
  return (
    <div className="h-screen w-full flex bg-background font-sans overflow-hidden fixed inset-0 z-50 animate-[fadeIn_0.2s_ease-out]">
      {/* ── Left Branding Column (Desktop) ── */}
      <div className="w-1/2 lg:flex flex-col justify-between hidden p-14 relative overflow-hidden bg-accent/5">
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand/10 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3"></div>
        <div className="relative z-10 flex items-center justify-between w-full">
          <Logo className="w-16 h-16" showText={true} />
          <div className="flex items-center gap-2 px-4 py-2 bg-accent/10 backdrop-blur-md rounded-full shadow-sm border border-accent/20 text-sm font-semibold text-accent">
            <ShieldCheck weight="fill" className="w-4 h-4" />
            Admin Portal
          </div>
        </div>
        <div className="relative z-10 max-w-lg">
          <h1 className="text-5xl font-extrabold text-foreground tracking-tight leading-[1.1] mb-6">
            Management &amp; Operational Control.
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed mb-10 font-medium">
            Access the POS, manage inventory securely, and view real-time sales analytics to drive business growth.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 bg-background/50 backdrop-blur-md p-4 rounded-2xl border border-border/50">
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                <Lock weight="fill" className="w-5 h-5" />
              </div>
              <span className="font-semibold text-sm">Secure Access</span>
            </div>
            <div className="flex items-center gap-3 bg-background/50 backdrop-blur-md p-4 rounded-2xl border border-border/50">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <ShieldCheck weight="fill" className="w-5 h-5" />
              </div>
              <span className="font-semibold text-sm">Role Protected</span>
            </div>
            <div className="flex items-center gap-3 bg-background/50 backdrop-blur-md p-4 rounded-2xl border border-border/50 col-span-2">
              <div className="w-10 h-10 rounded-full bg-sky-500/10 flex items-center justify-center text-sky-600">
                <Buildings weight="fill" className="w-5 h-5" />
              </div>
              <span className="font-semibold text-sm">Authorized Personnel Only — All Access is Logged</span>
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
            <AdminLoginForm onSuccess={onAdminLoginSuccess} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Admin Login Form ─────────────────────────────────────────────────────── */

function AdminLoginForm({ onSuccess }) {
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
      const result = await loginAdmin({ email, password });

      if (!result.ok) {
        if (result.errors) {
          setFieldErrors(result.errors);
        } else {
          setError(result.error || 'Login failed.');
        }
        setLoading(false);
        return;
      }

      // Success — pass the session up to App
      if (onSuccess) onSuccess(result.session);
    } catch {
      setError('Could not reach the backend server. Is it running?');
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/10 mb-4">
          <ShieldCheck weight="fill" className="w-8 h-8 text-accent" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Admin Sign In</h2>
        <p className="text-sm text-muted-foreground mt-1">Enter your admin credentials to continue</p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-sm font-medium text-center animate-[fadeIn_0.2s_ease-out]">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email */}
        <div>
          <label htmlFor="admin-email" className="block text-sm font-semibold text-foreground mb-1.5">
            Email address
          </label>
          <input
            id="admin-email"
            type="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@tarlactruckparts.local"
            className={`w-full px-4 py-3 rounded-xl border bg-secondary/50 text-foreground placeholder:text-muted-foreground/50 outline-none transition-all focus:ring-2 focus:ring-accent/30 focus:border-accent ${
              fieldErrors.email ? 'border-red-500' : 'border-border'
            }`}
          />
          {fieldErrors.email && (
            <p className="mt-1 text-xs text-red-500">{fieldErrors.email}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="admin-password" className="block text-sm font-semibold text-foreground mb-1.5">
            Password
          </label>
          <div className="relative">
            <input
              id="admin-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={`w-full px-4 py-3 rounded-xl border bg-secondary/50 text-foreground placeholder:text-muted-foreground/50 outline-none transition-all focus:ring-2 focus:ring-accent/30 focus:border-accent pr-12 ${
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

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-accent text-white font-semibold text-sm transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

      <p className="mt-6 text-xs text-muted-foreground text-center">
        Authorized personnel only. All access is logged.
      </p>
    </div>
  );
}
