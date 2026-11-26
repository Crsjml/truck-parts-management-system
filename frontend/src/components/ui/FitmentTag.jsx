import React from 'react';
import { fitmentSummary } from '../../utils/compatibilityModels';

// One-line catalogue fitment: "Fits Isuzu Forward/Giga +1", full list in the tooltip.
// No fitment is a quiet neutral tag, not an error.
export default function FitmentTag({ part, className = '' }) {
  const summary = fitmentSummary(part);
  if (!summary) {
    return (
      <span className={`inline-flex w-fit items-center rounded border border-border px-1.5 text-xs text-slate-600 dark:text-slate-400 ${className}`}>
        No fitment
      </span>
    );
  }
  const extra = summary.more > 0 ? ` +${summary.more}` : '';
  return (
    <span className={`block truncate text-xs text-slate-600 dark:text-slate-400 ${className}`} title={`Fits: ${summary.full}`}>
      Fits <span className="font-semibold text-foreground">{summary.label}</span>{extra}
    </span>
  );
}
