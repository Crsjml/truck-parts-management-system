import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowUUpLeft, ShieldCheck, Clock, FileText } from '@phosphor-icons/react';

export default function ReturnPolicyModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 pointer-events-none">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-auto bg-black/40 backdrop-blur-sm" 
            onClick={onClose} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="pointer-events-auto relative w-full max-w-2xl rounded-[2.5rem] border border-border/50 bg-background/95 backdrop-blur-3xl shadow-2xl flex flex-col max-h-full overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border/50 shrink-0 bg-background">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brandBlue-500/10 text-brandBlue-500 flex items-center justify-center">
                  <ArrowUUpLeft weight="duotone" className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">Return & Refund Policy</h3>
                  <p className="text-xs text-muted-foreground">Tarlac Truck Pitstop Warranty Terms</p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="rounded-full border border-border bg-background p-2 text-muted-foreground transition hover:border-border hover:text-foreground hover:bg-secondary shadow-sm"
              >
                <X weight="bold" className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto p-6 space-y-8 custom-scrollbar">
              <div className="space-y-3">
                <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Clock weight="duotone" className="w-4 h-4 text-brandBlue-400" /> 30-Day Return Window
                </h4>
                <p className="text-sm leading-relaxed text-foreground">
                  We accept returns for most unused, uninstalled, and undamaged items within <strong>30 days</strong> of the original purchase date. 
                  Parts must be returned in their original packaging with all included hardware, instructions, and protective materials.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <ShieldCheck weight="duotone" className="w-4 h-4 text-emerald-500" /> Fitment Guarantee
                </h4>
                <p className="text-sm leading-relaxed text-foreground">
                  All parts are backed by a 90-day fitment guarantee. If a part does not fit your vehicle despite matching the exact make, model, and year specified in our catalog, you are eligible for a full refund or exchange with zero restocking fees.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <FileText weight="duotone" className="w-4 h-4 text-orange-400" /> Exceptions & Restocking Fees
                </h4>
                <ul className="text-sm leading-relaxed text-foreground space-y-2 list-disc list-inside">
                  <li>Electrical components (sensors, ECMs, relays) are <strong>strictly non-refundable</strong> once unsealed.</li>
                  <li>Special order or custom-fabricated parts cannot be returned.</li>
                  <li>A <strong>15% restocking fee</strong> applies to all returns that are not a result of our error (e.g., customer ordered the wrong part).</li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border/50 bg-secondary/30 shrink-0 text-center">
              <p className="text-xs text-muted-foreground font-medium">
                For return authorizations, please contact <a href="mailto:wholesale@tarlactruckparts.local" className="text-brandBlue-500 hover:underline">wholesale@tarlactruckparts.local</a>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body
  );
}
