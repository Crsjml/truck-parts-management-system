import React from 'react';
import { TrendUp, TrendDown } from '@phosphor-icons/react';

export default function KpiTile({ label, value, delta, icon: Icon, iconColorClass, iconBgClass, iconBorderClass }) {
  const hasDelta = delta !== null && delta !== undefined;
  const isPositive = hasDelta && delta >= 0;

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-start justify-between gap-4">
      <div className="space-y-1.5 min-w-0">
        <span className="text-2xs font-bold uppercase text-muted-foreground">{label}</span>
        <h3 className="text-xl font-bold text-foreground font-display break-words">{value}</h3>
        {hasDelta ? (
          <p className={`text-2xs flex items-center gap-1 font-medium ${isPositive ? 'text-emerald-700 dark:text-emerald-300' : 'text-brandRed-700 dark:text-brandRed-300'}`}>
            {isPositive ? <TrendUp weight="bold" className="w-3 h-3" /> : <TrendDown weight="bold" className="w-3 h-3" />}
            {isPositive ? '+' : '-'}{Math.abs(delta).toFixed(1)}% vs prior
          </p>
        ) : (
          <p className="text-2xs text-muted-foreground flex items-center gap-1 font-medium">
            No prior period
          </p>
        )}
      </div>
      <div className="p-2.5 rounded-lg border border-border bg-secondary text-brandBlue-600 dark:text-brandBlue-400 shrink-0">
        <Icon weight="duotone" className="w-5 h-5" />
      </div>
    </div>
  );
}
