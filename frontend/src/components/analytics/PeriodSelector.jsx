import React from 'react';
import { PERIODS } from '../../utils/salesAnalytics';

export default function PeriodSelector({ selectedPeriod, onSelectPeriod }) {
  return (
    <div className="flex bg-secondary/50 p-1 rounded-xl glass-panel w-max border border-border/50">
      {PERIODS.map((period) => {
        const isActive = selectedPeriod === period.key;
        return (
          <button
            key={period.key}
            onClick={() => onSelectPeriod(period.key)}
            aria-pressed={isActive}
            className={`
              px-4 py-1.5 text-xs font-semibold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/50
              ${isActive 
                ? 'bg-amber-500 text-amber-950 shadow-sm' 
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }
            `}
          >
            {period.label}
          </button>
        );
      })}
    </div>
  );
}
