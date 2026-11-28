import { CurrencyDollar } from '@phosphor-icons/react';

// Online orders are mostly one payment method, so a single card replaces the
// bar chart. Shares come from real payments (dayPaymentMix), never hardcoded.
export default function OnlineMixCard({ mix, orders, revenueLabel }) {
  const [top, ...rest] = mix;
  if (!top) return null;
  return (
    <div className="h-full flex items-center justify-center p-4">
      <div className="bg-secondary border border-border rounded-lg p-4 flex items-center justify-between w-full max-w-sm">
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Online Payments</span>
          <h3 className="text-2xl font-bold text-foreground font-display">{Math.round(top.percentage)}% {top.label}</h3>
          {rest.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {rest.map(m => `${Math.round(m.percentage)}% ${m.label}`).join(' · ')}
            </p>
          )}
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
            {orders} orders · {revenueLabel}
          </p>
        </div>
        <div className="p-2.5 rounded-lg border border-border bg-background text-brandBlue-600 dark:text-brandBlue-400">
          <CurrencyDollar weight="duotone" className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
