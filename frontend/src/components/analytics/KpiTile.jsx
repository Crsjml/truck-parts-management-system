import React from 'react';
import { TrendUp, TrendDown } from '@phosphor-icons/react';

export default function KpiTile({ label, value, delta, icon: Icon, iconColorClass, iconBgClass, iconBorderClass }) {
  const hasDelta = delta !== null && delta !== undefined;
  const isPositive = hasDelta && delta >= 0;

  return (
    <div className="glass-panel p-5 rounded-2xl flex items-center justify-between border-t border-t-white/5">
      <div className="space-y-2">
        <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
        <h3 className="text-2xl font-bold text-foreground font-display">{value}</h3>
        {hasDelta ? (
          <p className={`text-2xs flex items-center gap-1 font-medium ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isPositive ? <TrendUp weight="bold" className="w-3 h-3" /> : <TrendDown weight="bold" className="w-3 h-3" />}
            {isPositive ? '+' : '-'}{Math.abs(delta).toFixed(1)}% vs prior
          </p>
        ) : (
          <p className="text-2xs text-muted-foreground flex items-center gap-1 font-medium">
            No prior period
          </p>
        )}
      </div>
      <div className={`p-3 rounded-xl border ${iconBgClass} ${iconColorClass} ${iconBorderClass}`}>
        <Icon weight="duotone" className="w-5 h-5" />
      </div>
    </div>
  );
}
