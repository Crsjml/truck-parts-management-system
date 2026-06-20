import React from 'react';
import { Wrench, ChartLineUp } from '@phosphor-icons/react';

export default function Footer({ className = "", variant = "default" }) {
  const currentYear = new Date().getFullYear();

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
    <footer className={`w-full py-6 mt-12 border-t ${borderClass} flex flex-col md:flex-row justify-between items-center gap-4 text-xs ${textClass} shrink-0 font-semibold transition-colors duration-300 ${className}`}>
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
    </footer>
  );
}
