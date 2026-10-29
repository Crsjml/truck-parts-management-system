import { useMemo, useState } from 'react';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';

const STATUS_DOT = {
  Paid: 'bg-emerald-500',
  Overdue: 'bg-brandRed-500',
  'Due Soon': 'bg-amber-500',
  Pending: 'bg-brandBlue-500'
};

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Month-grid view of PurchasingModule's payableRows: each day cell lists the
// POs due (or paid) that day, color-coded by paymentStatus. Reuses the same
// paymentStatus already computed for the Payables table — no new date math.
export default function PaymentsCalendar({ payableRows, formatCurrency, onSelectPo }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const byDay = useMemo(() => {
    const map = new Map();
    payableRows.forEach(po => {
      const dateSource = po.paymentStatus === 'Paid' ? po.paidAt : po.paymentDueDate;
      if (!dateSource) return;
      const d = new Date(dateSource);
      if (Number.isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(po);
    });
    return map;
  }, [payableRows]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-foreground">
          {cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </h4>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            className="p-1.5 rounded-lg border border-border hover:bg-secondary text-muted-foreground transition-colors"
            aria-label="Previous month"
          >
            <CaretLeft weight="bold" className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            className="p-1.5 rounded-lg border border-border hover:bg-secondary text-muted-foreground transition-colors"
            aria-label="Next month"
          >
            <CaretRight weight="bold" className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center text-2xs font-bold text-muted-foreground uppercase">
        {WEEKDAY_LABELS.map(d => <div key={d}>{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((day, i) => {
          if (day === null) return <div key={`blank-${i}`} className="min-h-[88px]" />;
          const key = `${year}-${month}-${day}`;
          const entries = byDay.get(key) || [];
          const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
          return (
            <div key={key} className={`min-h-[88px] rounded-lg border p-1.5 space-y-1 ${isToday ? 'border-accent bg-accent/5' : 'border-border'}`}>
              <span className={`text-2xs font-bold ${isToday ? 'text-accent' : 'text-muted-foreground'}`}>{day}</span>
              {entries.slice(0, 3).map(po => (
                <button
                  key={po.id}
                  type="button"
                  onClick={() => onSelectPo?.(po)}
                  className="w-full text-left flex items-center gap-1 px-1 py-0.5 rounded bg-secondary/60 hover:bg-secondary text-2xs font-semibold text-foreground truncate transition-colors"
                  title={`${po.supplierName} — ${formatCurrency(po.amountDue)} (${po.paymentStatus})`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[po.paymentStatus] || 'bg-muted-foreground'}`} />
                  <span className="truncate">{po.supplierName}</span>
                </button>
              ))}
              {entries.length > 3 && (
                <span className="block text-2xs text-muted-foreground font-medium">+{entries.length - 3} more</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 text-2xs text-muted-foreground font-semibold pt-2 border-t border-border">
        {Object.entries(STATUS_DOT).map(([label, dot]) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${dot}`} /> {label}
          </span>
        ))}
      </div>
    </div>
  );
}
