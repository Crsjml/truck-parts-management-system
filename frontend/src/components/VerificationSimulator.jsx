import React, { useState, useEffect } from 'react';
import { EnvelopeOpen, X, Check, CircleNotch, Envelope, Trash, PaperPlaneTilt, Archive, Warning } from '@phosphor-icons/react';

export default function VerificationSimulator({
  email,
  code,
  showNotification,
  setShowNotification,
  showModal,
  setShowModal,
  onAutoVerify
}) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Native Web Audio API chime sound
  const playChime = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const now = ctx.currentTime;
      
      // Sound chime: two-tone beep (premium notification feel)
      // First tone (C5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now);
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.12, now + 0.04);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.22);
      
      // Second tone (E5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, now + 0.1);
      gain2.gain.setValueAtTime(0, now + 0.1);
      gain2.gain.linearRampToValueAtTime(0.12, now + 0.14);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.32);
    } catch (e) {
      console.error('Audio chime failed to play:', e);
    }
  };

  // Play chime when notification is shown
  useEffect(() => {
    if (showNotification) {
      playChime();
      
      // Auto dismiss notification after 15 seconds
      const timer = setTimeout(() => {
        setShowNotification(false);
      }, 15000);
      
      return () => clearTimeout(timer);
    }
  }, [showNotification]);

  const handleVerifyAction = async (e) => {
    if (e) e.stopPropagation();
    setIsVerifying(true);
    setErrorMessage('');
    
    const result = await onAutoVerify(email, code);
    setIsVerifying(false);
    
    if (result && !result.ok) {
      setErrorMessage(result.error || 'Verification failed.');
    }
  };

  const handleOpenMailbox = (e) => {
    if (e) e.stopPropagation();
    setShowNotification(false);
    setShowModal(true);
  };

  if (!email || !code) return null;

  return (
    <>
      {/* macOS-style slide-in push notification */}
      {showNotification && (
        <div 
          onClick={handleOpenMailbox}
          className="fixed top-4 right-4 z-50 w-96 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 p-4 shadow-2xl flex gap-3.5 items-start cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:bg-white/95 dark:hover:bg-slate-900/95 animate-scaleUp group"
        >
          {/* Mock app icon */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-red-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-red-500/25">
            <EnvelopeOpen weight="duotone" className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Mail Client</span>
              <span className="text-[10px] text-muted-foreground font-medium">Just now</span>
            </div>
            <h4 className="text-xs font-bold text-foreground mt-0.5 truncate">Tarlac Truck Pitstop</h4>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
              Verify your account - Tarlac Truck Pitstop. Your 6-digit code is <span className="font-mono font-bold text-accent">{code}</span>.
            </p>

            <div className="flex gap-2 mt-3.5">
              <button
                type="button"
                onClick={handleOpenMailbox}
                className="px-3 py-1.5 rounded-lg border border-border bg-slate-50 dark:bg-slate-800 text-[11px] font-bold text-foreground transition hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Open Mailbox
              </button>
              <button
                type="button"
                disabled={isVerifying}
                onClick={handleVerifyAction}
                className="px-3 py-1.5 rounded-lg bg-accent text-[11px] font-bold text-white transition hover:bg-accent/90 disabled:opacity-50 flex items-center gap-1 shadow-md shadow-accent/20"
              >
                {isVerifying ? (
                  <CircleNotch className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                Auto-Verify
              </button>
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowNotification(false);
            }}
            className="p-1 rounded-md text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-foreground transition opacity-0 group-hover:opacity-100"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* HTML Mailbox Details Modal (Desktop simulated client) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 dark:bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-4xl h-[600px] rounded-3xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-slate-950 shadow-2xl flex flex-col overflow-hidden animate-scaleUp">
            
            {/* Title Bar (macOS style window control) */}
            <div className="h-12 border-b border-slate-200/80 dark:border-white/5 bg-slate-100/50 dark:bg-slate-900/50 px-4 flex items-center justify-between shrink-0 select-none">
              <div className="flex items-center gap-2">
                <div onClick={() => setShowModal(false)} className="w-3 h-3 rounded-full bg-rose-500 hover:bg-rose-600 cursor-pointer flex items-center justify-center text-[8px] text-rose-900 font-bold">✕</div>
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              </div>
              <div className="text-xs font-bold text-muted-foreground tracking-wide">
                Mail Simulator — {email}
              </div>
              <div className="w-12"></div> {/* spacer */}
            </div>

            {/* Main Application Area */}
            <div className="flex-1 flex min-h-0 overflow-hidden">
              
              {/* Mailbox Folders Sidebar (1/4 width) */}
              <aside className="w-56 border-r border-slate-200/80 dark:border-white/5 bg-slate-100/20 dark:bg-slate-900/10 p-3 flex flex-col justify-between shrink-0 hidden md:flex select-none">
                <div className="space-y-4">
                  <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Mailboxes</div>
                  <nav className="space-y-0.5">
                    <button className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold bg-accent/10 text-accent border border-accent/25">
                      <div className="flex items-center gap-2.5">
                        <Envelope weight="duotone" className="w-4 h-4" />
                        Inbox
                      </div>
                      <span className="w-4 h-4 rounded-full bg-accent text-[9px] font-extrabold text-white flex items-center justify-center">1</span>
                    </button>
                    <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:bg-slate-200/55 dark:hover:bg-white/5 hover:text-foreground transition">
                      <Archive weight="duotone" className="w-4 h-4" />
                      Archive
                    </button>
                    <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:bg-slate-200/55 dark:hover:bg-white/5 hover:text-foreground transition">
                      <PaperPlaneTilt weight="duotone" className="w-4 h-4" />
                      Sent
                    </button>
                    <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:bg-slate-200/55 dark:hover:bg-white/5 hover:text-foreground transition">
                      <Trash weight="duotone" className="w-4 h-4" />
                      Trash
                    </button>
                  </nav>
                </div>
                <div className="px-3 py-2 rounded-2xl bg-secondary border border-border text-[10px] text-muted-foreground font-semibold leading-relaxed">
                  💡 This panel simulates incoming system emails locally.
                </div>
              </aside>

              {/* Message List Pane (1.5/4 width) */}
              <section className="w-72 border-r border-slate-200/80 dark:border-white/5 p-2 bg-white/40 dark:bg-slate-900/20 flex flex-col shrink-0 min-h-0 overflow-y-auto select-none">
                <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Today</div>
                <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/5 shadow-sm mt-1 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-foreground">Tarlac Truck Pitstop</span>
                    <span className="text-[10px] text-accent font-bold">Just now</span>
                  </div>
                  <h5 className="text-[11px] font-bold text-foreground mt-1">Verify your account</h5>
                  <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                    Thank you for registering. Please enter the verification code to activate your account.
                  </p>
                  <div className="mt-2.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                    <span className="text-[9px] text-accent uppercase font-bold tracking-wider">Unread</span>
                  </div>
                </div>
              </section>

              {/* Email Content Viewer (Main Area) */}
              <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 overflow-y-auto">
                {/* Header Information */}
                <div className="p-5 border-b border-slate-100 dark:border-white/5 flex items-start justify-between">
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-foreground tracking-tight truncate">
                      Verify your account - Tarlac Truck Pitstop
                    </h2>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-white font-bold text-sm shadow-md shadow-accent/20">
                        T
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <span>Tarlac Truck Pitstop</span>
                          <span className="text-[10px] text-muted-foreground font-normal">&lt;noreply@tarlactruckparts.local&gt;</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          To: <span className="font-semibold">{email}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider shrink-0 bg-secondary px-2.5 py-1 rounded-md border border-border">
                    {new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {/* Email Body Template */}
                <div className="p-6 md:p-8 flex-1 bg-slate-50 dark:bg-slate-900/50">
                  <div className="mx-auto max-w-xl bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-white/5 rounded-3xl p-6 md:p-8 shadow-xl shadow-slate-200/30 dark:shadow-none space-y-6">
                    {/* Brand Banner */}
                    <div className="border-b border-slate-100 dark:border-white/5 pb-5 text-center">
                      <h3 className="text-xl font-black tracking-tight text-accent glow-text-red">
                        TARLAC TRUCK PITSTOP
                      </h3>
                      <p className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground mt-1.5 font-bold">
                        Genuine Heavy Duty Spares
                      </p>
                    </div>

                    <div className="space-y-4 text-xs md:text-sm text-foreground leading-relaxed">
                      <p className="font-bold">Hello Customer,</p>
                      <p>
                        Thank you for registering with us! To complete your activation and gain access to client features, discount lists, and parts procurement history, please verify your email address.
                      </p>
                      
                      {/* Code Block Container */}
                      <div className="my-6 p-5 rounded-2xl bg-secondary border border-border text-center space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">
                          One-Time Verification Code
                        </span>
                        <div className="font-mono text-3xl font-black tracking-[0.3em] text-foreground select-all bg-background border border-border inline-block px-5 py-2.5 rounded-xl shadow-inner my-1">
                          {code}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          This code will expire in 15 minutes.
                        </p>
                      </div>

                      {/* Auto Verify Call to action */}
                      <div className="space-y-2.5">
                        <button
                          type="button"
                          disabled={isVerifying}
                          onClick={handleVerifyAction}
                          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3.5 text-xs font-bold text-white transition hover:bg-accent/90 disabled:opacity-75 shadow-md shadow-accent/20 cursor-pointer"
                        >
                          {isVerifying ? (
                            <>
                              <CircleNotch className="w-4.5 h-4.5 animate-spin" />
                              Verifying and logging in...
                            </>
                          ) : (
                            <>
                              <Check className="w-4.5 h-4.5" />
                              Auto-Verify & Go to Login
                            </>
                          )}
                        </button>

                        {errorMessage && (
                          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400 flex items-start gap-2.5 animate-scaleUp">
                            <Warning className="w-4.5 h-4.5 text-red-500 shrink-0 mt-0.5" />
                            <div>{errorMessage}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Email Sign-off */}
                    <div className="pt-6 border-t border-slate-100 dark:border-white/5 text-[11px] text-muted-foreground leading-relaxed space-y-1">
                      <p className="font-bold">Regards,</p>
                      <p className="font-bold text-foreground">Tarlac Truck Pitstop Support Team</p>
                      <p className="text-[10px] text-slate-600">This is an automated simulation email. Please do not reply directly.</p>
                    </div>
                  </div>
                </div>
              </main>

            </div>
          </div>
        </div>
      )}
    </>
  );
}
