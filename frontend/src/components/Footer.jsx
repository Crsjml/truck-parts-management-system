import React, { useState, useEffect } from 'react';
import { Wrench, ChartLineUp, CaretDown, CaretUp } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Footer({ className = "", variant = "default" }) {
  const currentYear = new Date().getFullYear();
  
  const [isVisible, setIsVisible] = useState(() => {
    const saved = localStorage.getItem('ttp_footer_visible');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('ttp_footer_visible', JSON.stringify(isVisible));
  }, [isVisible]);

  // variant === "dark" is used for panels that are always dark (e.g. AuthPortal left column)
  // variant === "default" responds to the application's light/dark mode
  const borderClass = variant === "dark" 
    ? "border-slate-800/40" 
    : "border-border/60 dark:border-slate-800/40";
  const textClass = variant === "dark" 
    ? "text-slate-500" 
    : "text-muted-foreground/75 dark:text-slate-500/80";
  const iconAccent = variant === "dark" 
    ? "text-red-500/60" 
    : "text-accent/70 dark:text-red-500/55";
  const iconBlue = variant === "dark" 
    ? "text-brandBlue-500/60" 
    : "text-brandBlue-600/70 dark:text-brandBlue-500/55";

  return (
    <div className={`relative ${className}`}>
      <div className="absolute right-6 -top-8 z-10 flex justify-end">
        <button
          onClick={() => setIsVisible(!isVisible)}
          className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-t-lg border-t border-l border-r ${borderClass} bg-background/80 backdrop-blur-sm ${textClass} hover:text-foreground transition-all shadow-sm`}
          aria-label={isVisible ? "Hide API Status" : "Show API Status"}
        >
          {isVisible ? <CaretDown weight="bold" className="w-3 h-3" /> : <CaretUp weight="bold" className="w-3 h-3" />}
          API Status
        </button>
      </div>

      <AnimatePresence initial={false}>
        {isVisible && (
          <motion.footer 
            initial={{ height: 0, opacity: 0, marginTop: 0, paddingBottom: 0, paddingTop: 0 }}
            animate={{ height: 'auto', opacity: 1, marginTop: 16, paddingBottom: 16, paddingTop: 16 }}
            exit={{ height: 0, opacity: 0, marginTop: 0, paddingBottom: 0, paddingTop: 0 }}
            className={`w-full border-t ${borderClass} flex flex-col md:flex-row justify-between items-center gap-4 text-xs ${textClass} shrink-0 font-semibold transition-colors overflow-hidden`}
          >
            <p>© {currentYear} Tarlac Truck Pitstop. All rights reserved.</p>
            <div className="flex gap-4">
              <span className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-default">
                <Wrench weight="duotone" className={`w-4 h-4 ${iconAccent}`} />
                Wholesale Spare Parts
              </span>
              <span className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-default">
                <ChartLineUp weight="duotone" className={`w-4 h-4 ${iconBlue}`} />
                Logistics Intelligence
              </span>
            </div>
          </motion.footer>
        )}
      </AnimatePresence>
    </div>
  );
}
