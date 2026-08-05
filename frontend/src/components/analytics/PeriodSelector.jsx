import React from 'react';
import { PERIODS } from '../../utils/salesAnalytics';

export default function PeriodSelector({ selectedPeriod, onSelectPeriod }) {
  return (
    <div className="flex bg-secondary p-1 rounded-lg w-max border border-border">
      {PERIODS.map((period) => {
        const isActive = selectedPeriod === period.key;
        return (
          <button
            key={period.key}
            onClick={() => onSelectPeriod(period.key)}
            aria-pressed={isActive}
            className={`
              px-3 py-1.5 text-xs font-semibold rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-brandBlue-500/50
              ${isActive 
                ? 'bg-background text-brandBlue-600 dark:text-brandBlue-400 border border-border' 
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
