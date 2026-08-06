import { useState, useMemo } from 'react';
import { CaretLeft, CaretRight, CurrencyDollar, FileText, ShoppingCart, TrendUp, CheckCircle, Truck, X, Clock } from '@phosphor-icons/react';
import { useSettings } from '../../context/SettingsContext';
import KpiTile from './KpiTile';
import { inRange, computeKpis, rankPartsBySales, orderStatusBreakdown } from '../../utils/salesAnalytics';

const PAYMENT_METHODS = ['CASH', 'CARD', 'CHEQUE', 'BANK_TRANSFER', 'GCASH'];
const PAYMENT_LABELS = { CASH: 'Cash', CARD: 'Card', CHEQUE: 'Cheque', BANK_TRANSFER: 'Transfer', GCASH: 'GCash' };

export default function DailySalesSummary({ transactions }) {
  const { formatBaseCurrency } = useSettings();
  const today = new Date();
  
  const [selectedDate, setSelectedDate] = useState(today.toISOString().split('T')[0]);

  // Phase 1 - Date math
  const { dayStart, dayEnd, prevDayStart, prevDayEnd } = useMemo(() => {
    if (!selectedDate) return { dayStart: new Date(), dayEnd: new Date(), prevDayStart: new Date(), prevDayEnd: new Date() };
    
    const start = new Date(selectedDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(selectedDate);
    end.setHours(23, 59, 59, 999);

    const prevStart = new Date(start.getTime() - 864e5);
    const prevEnd = new Date(end.getTime() - 864e5);
    
    return { dayStart: start, dayEnd: end, prevDayStart: prevStart, prevDayEnd: prevEnd };
  }, [selectedDate]);

  const isToday = selectedDate === today.toISOString().split('T')[0];

  const handlePrevDay = () => {
    const prev = new Date(dayStart.getTime() - 864e5);
    setSelectedDate(prev.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    if (isToday) return;
    const next = new Date(dayStart.getTime() + 864e5);
    setSelectedDate(next.toISOString().split('T')[0]);
  };

  // Phase 2 - Analytics math
  const dayTx = useMemo(() => inRange(transactions, dayStart, dayEnd), [transactions, dayStart, dayEnd]);
  const prevDayTx = useMemo(() => inRange(transactions, prevDayStart, prevDayEnd), [transactions, prevDayStart, prevDayEnd]);
  
  const kpis = useMemo(() => computeKpis(dayTx, prevDayTx), [dayTx, prevDayTx]);
  
  const { curUnits, unitsDelta } = useMemo(() => {
    const getUnits = (txs) => txs.reduce((sum, t) => sum + (t.items || []).reduce((s, i) => s + (i.quantity || 0), 0), 0);
    const cur = getUnits(dayTx);
    const prev = getUnits(prevDayTx);
    const delta = prev === 0 ? null : ((cur - prev) / prev) * 100;
    return { curUnits: cur, unitsDelta: delta };
  }, [dayTx, prevDayTx]);

  const paymentMix = useMemo(() => {
    const mix = {};
    let totalRevenue = 0;
    PAYMENT_METHODS.forEach(m => mix[m] = 0);
    
    dayTx.forEach(t => {
      let m = t.paymentMethod;
      if (!PAYMENT_METHODS.includes(m)) m = 'CASH';
      mix[m] += (t.total || 0);
      totalRevenue += (t.total || 0);
    });
    
    return Object.entries(mix)
      .map(([method, amount]) => ({
        method,
        label: PAYMENT_LABELS[method] || method,
        amount,
        percentage: totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0
      }))
      .filter(m => m.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [dayTx]);

  const orderStatuses = useMemo(() => orderStatusBreakdown(transactions, { start: dayStart, end: dayEnd }), [transactions, dayStart, dayEnd]);
  
  const topParts = useMemo(() => rankPartsBySales(transactions, { start: dayStart, end: dayEnd }, 5), [transactions, dayStart, dayEnd]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Completed': return CheckCircle;
      case 'Ready for Pickup': return Truck;
      case 'Cancelled': return X;
      default: return Clock;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/30';
      case 'Ready for Pickup': return 'text-brandBlue-700 dark:text-brandBlue-300 bg-brandBlue-500/10 border-brandBlue-500/30';
      case 'Cancelled': return 'text-brandRed-700 dark:text-brandRed-300 bg-brandRed-500/10 border-brandRed-500/30';
      default: return 'text-brandBlue-700 dark:text-brandBlue-300 bg-brandBlue-500/10 border-brandBlue-500/30';
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header and Controls */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-foreground font-display">Daily Sales Summary</h3>
          <p className="text-xs text-muted-foreground">Detailed breakdown for {dayStart.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handlePrevDay}
            className="p-1.5 rounded-lg border border-border bg-background hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title="Previous Day"
          >
            <CaretLeft weight="bold" className="w-4 h-4" />
          </button>
          
          <input
            type="date"
            value={selectedDate}
            max={today.toISOString().split('T')[0]}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
            className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-brandBlue-500 transition-colors text-foreground min-w-[130px]"
          />
          
          <button 
            onClick={handleNextDay}
            disabled={isToday}
            className="p-1.5 rounded-lg border border-border bg-background hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Next Day"
          >
            <CaretRight weight="bold" className="w-4 h-4" />
          </button>
        </div>
      </div>

      {dayTx.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-secondary/50 rounded-full flex items-center justify-center mb-3">
            <ShoppingCart weight="duotone" className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-semibold text-foreground">No sales recorded for {dayStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
          <p className="text-xs text-muted-foreground mt-1">Try selecting a different date or check previous days.</p>
        </div>
      ) : (
        <>
          {/* KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiTile label="Revenue" value={formatBaseCurrency(kpis.revenue)} delta={kpis.deltas?.revenue} icon={CurrencyDollar} />
            <KpiTile label="Transactions" value={kpis.invoices} delta={kpis.deltas?.invoices} icon={FileText} />
            <KpiTile label="Units Sold" value={curUnits} delta={unitsDelta} icon={ShoppingCart} />
            <KpiTile label="Avg Ticket" value={formatBaseCurrency(kpis.avgInvoice)} delta={kpis.deltas?.avgInvoice} icon={TrendUp} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Payment Mix */}
            <div className="bg-card border border-border rounded-xl p-4 lg:col-span-1 flex flex-col space-y-4">
              <h4 className="text-xs font-bold text-foreground font-display uppercase tracking-wider text-muted-foreground border-b border-border pb-2">Payment Mix</h4>
              <div className="space-y-4 flex-1 flex flex-col justify-center">
                {paymentMix.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center">No payment data.</p>
                ) : (
                  paymentMix.map((mix) => (
                    <div key={mix.method} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground">{mix.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">{formatBaseCurrency(mix.amount)}</span>
                          <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded border border-border">{mix.percentage.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2 overflow-hidden flex border border-border/50">
                        <div 
                          className="bg-brandBlue-500 rounded-full" 
                          style={{ width: `${mix.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Order Status */}
            <div className="bg-card border border-border rounded-xl p-4 lg:col-span-1 flex flex-col space-y-4">
              <h4 className="text-xs font-bold text-foreground font-display uppercase tracking-wider text-muted-foreground border-b border-border pb-2">Order Status</h4>
              <div className="flex-1 flex flex-col justify-center gap-2.5">
                {orderStatuses.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center">No orders.</p>
                ) : (
                  orderStatuses.map((status) => {
                    const StatusIcon = getStatusIcon(status.name);
                    return (
                      <div key={status.name} className={`flex items-center justify-between p-3 rounded-lg border ${getStatusColor(status.name)} bg-opacity-30`}>
                        <div className="flex items-center gap-2">
                          <StatusIcon weight="bold" className="w-4 h-4" />
                          <span className="text-xs font-bold tracking-tight">{status.name}</span>
                        </div>
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded border border-current bg-background/80">
                          {status.count}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Top Parts */}
            <div className="bg-card border border-border rounded-xl p-4 lg:col-span-2 flex flex-col space-y-3">
              <h4 className="text-xs font-bold text-foreground font-display uppercase tracking-wider text-muted-foreground border-b border-border pb-2">Top Selling Parts</h4>
              <div className="flex-1 overflow-x-auto hide-scrollbar">
                {topParts.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center flex items-center justify-center h-full">No parts sold today.</p>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="text-muted-foreground font-semibold uppercase border-b border-border">
                        <th className="pb-2 pr-2">Part Name</th>
                        <th className="pb-2 text-right">Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {topParts.map((part) => (
                        <tr key={part.name} className="group hover:bg-secondary/50 transition-colors">
                          <td className="py-3 pr-2 font-medium text-foreground truncate max-w-[120px] sm:max-w-[180px]" title={part.name}>
                            {part.name}
                          </td>
                          <td className="py-3 text-right font-bold text-brandBlue-600 dark:text-brandBlue-400">
                            {part.quantity}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
