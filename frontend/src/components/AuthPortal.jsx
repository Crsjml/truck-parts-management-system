import React, { useState } from 'react';
import { ArrowLeft, CheckCircle, ShieldCheck, Truck, Percent, User } from '@phosphor-icons/react';
import { SignIn, SignUp } from '@clerk/clerk-react';
import Logo from './Logo';
import Footer from './Footer';

export default function AuthPortal({
  mode = 'customer',
  initialTab = 'login',
  onBackToStore,
}) {
  const isCustomerMode = mode === 'customer';
  const [activeTab, setActiveTab] = useState(initialTab);

  return (
    <div className="h-screen w-full flex bg-background font-sans overflow-hidden fixed inset-0 z-50">
      {/* ── Left Branding Column (Desktop) ── */}
      <div className="w-1/2 lg:flex flex-col justify-between hidden p-14 relative overflow-hidden bg-brand/5">
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand/10 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3"></div>
        <div className="relative z-10 flex items-center justify-between w-full">
          <Logo className="w-16 h-16" showText={true} />
          {isCustomerMode ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-background/60 backdrop-blur-md rounded-full shadow-sm border border-border/50 text-sm font-semibold text-brand">
              <User weight="fill" className="w-4 h-4" />
              Customer Portal
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 bg-accent/10 backdrop-blur-md rounded-full shadow-sm border border-accent/20 text-sm font-semibold text-accent">
              <ShieldCheck weight="fill" className="w-4 h-4" />
              Admin Portal
            </div>
          )}
        </div>
        <div className="relative z-10 max-w-lg">
          <h1 className="text-5xl font-extrabold text-foreground tracking-tight leading-[1.1] mb-6">
            {isCustomerMode ? "Tarlac's Premium Truck Parts Hub." : "Management & Operational Control."}
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed mb-10 font-medium">
            {isCustomerMode 
              ? "Access exclusive pricing, track your orders instantly, and manage your fleet inventory from anywhere."
              : "Access the POS, manage inventory securely, and view real-time sales analytics to drive business growth."}
          </p>
          {isCustomerMode && (
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
          )}
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

        <div className="w-full max-w-md mx-auto relative z-10">
          <div className="mb-8 lg:hidden flex justify-center mt-12">
            <Logo className="w-16 h-16" showText={true} />
          </div>

          <div className="flex justify-center w-full min-h-[500px]">
             {activeTab === 'login' ? (
                <div className="w-full flex flex-col items-center">
                  <SignIn 
                    routing="virtual" 
                    afterSignInUrl="/"
                  />
                  {isCustomerMode && (
                    <p className="mt-6 text-sm text-muted-foreground text-center">
                      Don't have an account?{' '}
                      <button onClick={() => setActiveTab('register')} className="text-brand font-semibold hover:underline">
                        Sign up here
                      </button>
                    </p>
                  )}
                </div>
             ) : (
                <div className="w-full flex flex-col items-center">
                  <SignUp 
                    routing="virtual" 
                    afterSignUpUrl="/"
                  />
                  {isCustomerMode && (
                    <p className="mt-6 text-sm text-muted-foreground text-center">
                      Already have an account?{' '}
                      <button onClick={() => setActiveTab('login')} className="text-brand font-semibold hover:underline">
                        Sign in here
                      </button>
                    </p>
                  )}
                </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
