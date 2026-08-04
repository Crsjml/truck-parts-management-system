export const PERIODS = [
  { key: '7d', label: 'Last 7 Days', bucket: 'day', spanMs: 7 * 864e5, comparable: true },
  { key: '30d', label: 'Last 30 Days', bucket: 'week', spanMs: 30 * 864e5, comparable: true },
  { key: 'all', label: 'All Time', bucket: 'month', spanMs: 0, comparable: false }
];

export const PAYMENT_METHODS = ['CASH', 'CARD', 'CHEQUE', 'BANK_TRANSFER', 'GCASH'];
export const PAYMENT_COLORS = { CASH: '#059669', CARD: '#3b82f6', CHEQUE: '#d97706', BANK_TRANSFER: '#8b5cf6', GCASH: '#0891b2' };
export const PAYMENT_LABELS = { CASH: 'Cash', CARD: 'Card', CHEQUE: 'Cheque', BANK_TRANSFER: 'Transfer', GCASH: 'GCash' };

export const STATUS_COLORS = { 
  'Completed': '#10b981',
  'Ready for Pickup': '#3b82f6',
  'Cancelled': '#f43f5e',
  'Order Placed': '#f59e0b',
  'COMPLETED': '#10b981',
  'READY_FOR_PICKUP': '#3b82f6',
  'CANCELLED': '#f43f5e',
  'ORDER_PLACED': '#f59e0b'
};

export function resolvePeriod(key, now = new Date()) {
  const p = PERIODS.find(x => x.key === key) || PERIODS.find(x => x.key === '30d');
  const end = now;
  const start = p.spanMs ? new Date(now.getTime() - p.spanMs) : new Date(0);
  const prevEnd = start;
  const prevStart = p.spanMs ? new Date(start.getTime() - p.spanMs) : start;
  
  return {
    start,
    end,
    prevStart,
    prevEnd,
    bucket: p.bucket,
    comparable: p.comparable,
    spanMs: p.spanMs
  };
}

export function inRange(transactions, start, end) {
  return transactions.filter(t => {
    const d = new Date(t.transactionDate);
    return d >= start && d <= end;
  });
}

// ponytail: stripeSessionId presence indicates online channel vs in-store POS
export function byChannel(transactions, channel) {
  if (channel === 'online') {
    return transactions.filter(t => t.stripeSessionId != null);
  }
  if (channel === 'store') {
    return transactions.filter(t => t.stripeSessionId == null);
  }
  return transactions;
}

export function computeKpis(current, previous) {
  const revenue = current.reduce((sum, t) => sum + (t.total || 0), 0);
  const invoices = current.length;
  const avgInvoice = invoices ? revenue / invoices : 0;
  
  const totalUnits = current.reduce((sum, t) => {
    return sum + (t.items || []).reduce((itemSum, item) => itemSum + (item.quantity || 0), 0);
  }, 0);
  const unitsPerInvoice = invoices ? totalUnits / invoices : 0;
  
  const prevRevenue = previous.reduce((sum, t) => sum + (t.total || 0), 0);
  const prevInvoices = previous.length;
  const prevAvgInvoice = prevInvoices ? prevRevenue / prevInvoices : 0;
  
  const prevTotalUnits = previous.reduce((sum, t) => {
    return sum + (t.items || []).reduce((itemSum, item) => itemSum + (item.quantity || 0), 0);
  }, 0);
  const prevUnitsPerInvoice = prevInvoices ? prevTotalUnits / prevInvoices : 0;
  
  const deltas = previous.length === 0 ? {
    revenue: null,
    invoices: null,
    avgInvoice: null,
    unitsPerInvoice: null
  } : {
    revenue: prevRevenue === 0 ? null : ((revenue - prevRevenue) / prevRevenue) * 100,
    invoices: prevInvoices === 0 ? null : ((invoices - prevInvoices) / prevInvoices) * 100,
    avgInvoice: prevAvgInvoice === 0 ? null : ((avgInvoice - prevAvgInvoice) / prevAvgInvoice) * 100,
    unitsPerInvoice: prevUnitsPerInvoice === 0 ? null : ((unitsPerInvoice - prevUnitsPerInvoice) / prevUnitsPerInvoice) * 100
  };
  
  return { revenue, invoices, avgInvoice, unitsPerInvoice, deltas };
}

export function trendSeries(current, previous, range) {
  let { start, bucket, comparable, spanMs } = range;
  
  if (spanMs === 0 && current.length > 0) {
    let minD = new Date(current[0].transactionDate).getTime();
    let maxD = minD;
    for (const t of current) {
      const ms = new Date(t.transactionDate).getTime();
      if (ms < minD) minD = ms;
      if (ms > maxD) maxD = ms;
    }
    start = new Date(minD);
    spanMs = maxD - minD;
    if (spanMs === 0) spanMs = 1;
  }
  
  const numBuckets = bucket === 'day' ? Math.round(spanMs / 864e5) : bucket === 'week' ? Math.ceil(spanMs / (864e5 * 7)) : Math.ceil(spanMs / (864e5 * 30)) || 1;
  const buckets = Math.max(numBuckets, 1);
  const bucketMs = spanMs > 0 ? spanMs / buckets : 1;
  
  const series = Array.from({ length: buckets }, (_, i) => {
    const d = new Date(start.getTime() + (i * bucketMs));
    let label = '';
    if (bucket === 'day') {
      label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } else if (bucket === 'week') {
      label = `Wk ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    } else {
      label = d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
    }
    return {
      label,
      revenue: 0,
      prior: comparable ? 0 : null
    };
  });
  
  for (const t of current) {
    const d = new Date(t.transactionDate);
    let i = Math.floor((d - start) / bucketMs);
    if (i === buckets && buckets > 0) i = buckets - 1;
    if (i >= 0 && i < buckets) series[i].revenue += (t.total || 0);
  }
  
  if (comparable) {
    for (const t of previous) {
      const d = new Date(t.transactionDate);
      let i = Math.floor((d - (start.getTime() - spanMs)) / bucketMs);
      if (i === buckets && buckets > 0) i = buckets - 1;
      if (i >= 0 && i < buckets) series[i].prior += (t.total || 0);
    }
  }
  
  return series;
}

export function buildCategoryTree(categories) {
  const parentOf = new Map();
  const childrenOf = new Map();
  
  const catMap = new Map();
  for (const c of categories) catMap.set(c.id, c.name);
  
  for (const c of categories) {
    const parentName = c.parentCategoryId ? catMap.get(c.parentCategoryId) : c.name;
    parentOf.set(c.name, parentName);
    
    if (!childrenOf.has(parentName)) childrenOf.set(parentName, []);
    if (parentName !== c.name) {
      childrenOf.get(parentName).push(c.name);
    }
  }
  
  return { parentOf, childrenOf };
}

export function categoryRevenue(transactions, parts, tree, drilled) {
  const partMap = new Map();
  for (const p of parts) partMap.set(p.id, p.category);
  
  const revByCat = new Map();
  
  for (const t of transactions) {
    for (const item of (t.items || [])) {
      const cat = partMap.get(item.partId);
      const revenue = (item.quantity || 0) * (item.price || 0);
      
      if (!cat) {
        revByCat.set('Uncategorized', (revByCat.get('Uncategorized') || 0) + revenue);
        continue;
      }
      
      const parent = tree.parentOf.get(cat) || cat;
      
      let targetCat = parent;
      if (drilled === parent) {
        targetCat = cat;
      } else if (drilled && drilled !== parent) {
        continue; // not in drilled view
      }
      
      revByCat.set(targetCat, (revByCat.get(targetCat) || 0) + revenue);
    }
  }
  
  return Array.from(revByCat.entries()).map(([name, revenue]) => {
    const children = tree.childrenOf.get(name);
    const hasChildren = children && children.length > 0;
    return { name, revenue, hasChildren: !!hasChildren };
  });
}

export function topMovers(current, previous, limit) {
  const curCounts = new Map();
  const curRev = new Map();
  
  for (const t of current) {
    for (const item of (t.items || [])) {
      curCounts.set(item.name, (curCounts.get(item.name) || 0) + (item.quantity || 0));
      curRev.set(item.name, (curRev.get(item.name) || 0) + (item.quantity || 0) * (item.price || 0));
    }
  }
  
  const prevCounts = new Map();
  for (const t of previous) {
    for (const item of (t.items || [])) {
      prevCounts.set(item.name, (prevCounts.get(item.name) || 0) + (item.quantity || 0));
    }
  }
  
  const curArr = Array.from(curCounts.entries()).map(([name, quantity]) => ({ name, quantity, revenue: curRev.get(name) }));
  curArr.sort((a, b) => b.quantity - a.quantity);
  
  const prevArr = Array.from(prevCounts.entries()).map(([name, quantity]) => ({ name, quantity }));
  prevArr.sort((a, b) => b.quantity - a.quantity);
  
  const prevRanks = new Map();
  prevArr.forEach((p, i) => prevRanks.set(p.name, i));
  
  const result = curArr.map((c, i) => {
    const prevRank = prevRanks.has(c.name) ? prevRanks.get(c.name) : null;
    return {
      name: c.name,
      quantity: c.quantity,
      revenue: c.revenue,
      rankDelta: prevRank !== null ? prevRank - i : null
    };
  });
  
  if (limit) return result.slice(0, limit);
  return result;
}

export function paymentMix(transactions, range) {
  let { start, spanMs, bucket } = range;
  
  if (spanMs === 0 && transactions.length > 0) {
    let minD = new Date(transactions[0].transactionDate).getTime();
    let maxD = minD;
    for (const t of transactions) {
      const ms = new Date(t.transactionDate).getTime();
      if (ms < minD) minD = ms;
      if (ms > maxD) maxD = ms;
    }
    start = new Date(minD);
    spanMs = maxD - minD;
    if (spanMs === 0) spanMs = 1;
  }
  
  const numBuckets = bucket === 'day' ? Math.round(spanMs / 864e5) : bucket === 'week' ? Math.ceil(spanMs / (864e5 * 7)) : Math.ceil(spanMs / (864e5 * 30)) || 1;
  const buckets = Math.max(numBuckets, 1);
  const bucketMs = spanMs > 0 ? spanMs / buckets : 1;
  
  const series = Array.from({ length: buckets }, (_, i) => {
    const d = new Date(start.getTime() + (i * bucketMs));
    let label = '';
    if (bucket === 'day') {
      label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } else if (bucket === 'week') {
      label = `Wk ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    } else {
      label = d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
    }
    const row = { label };
    PAYMENT_METHODS.forEach(m => row[m] = 0);
    return row;
  });
  
  for (const t of transactions) {
    let m = t.paymentMethod;
    if (!PAYMENT_METHODS.includes(m)) m = 'CASH';
    
    const d = new Date(t.transactionDate);
    let i = Math.floor((d - start) / bucketMs);
    if (i === buckets && buckets > 0) i = buckets - 1;
    if (i >= 0 && i < buckets) {
      series[i][m] += (t.total || 0);
    }
  }
  
  return series;
}

export function rankPartsBySales(transactions, { start, end }, limit) {
  const spanMs = end - start;
  const prevEnd = start;
  const prevStart = new Date(start.getTime() - spanMs);
  
  const current = inRange(transactions, start, end);
  const previous = inRange(transactions, prevStart, prevEnd);
  return topMovers(current, previous, limit).map((m, i) => ({ ...m, rank: i + 1 }));
}

export function getRankDeltaBadge(rankDelta) {
  if (rankDelta === null) {
    return { text: 'NEW', style: 'text-purple-400 bg-purple-950/50 border-purple-800/40' };
  } else if (rankDelta > 0) {
    return { text: `▲${rankDelta}`, style: 'text-emerald-400 bg-emerald-950/50 border-emerald-800/40' };
  } else if (rankDelta < 0) {
    return { text: `▼${Math.abs(rankDelta)}`, style: 'text-rose-400 bg-rose-950/50 border-rose-800/40' };
  }
  return { text: '—', style: 'text-muted-foreground bg-slate-800/80 border-slate-700/50' };
}

export function slowMovingParts(parts, transactions, { start, end }, threshold = 0) {
  const current = inRange(transactions, start, end);
  const curCounts = new Map();
  
  for (const t of current) {
    for (const item of (t.items || [])) {
      curCounts.set(item.partId, (curCounts.get(item.partId) || 0) + (item.quantity || 0));
    }
  }
  
  const result = [];
  for (const p of parts) {
    if (p.stock > 0) {
      const sold = curCounts.get(p.id) || 0;
      if (sold <= threshold) {
        let lastSale = null;
        for (const t of transactions) {
          if ((t.items || []).some(i => i.partId === p.id)) {
            const d = new Date(t.transactionDate);
            if (!lastSale || d > lastSale) lastSale = d;
          }
        }
        let daysSinceLastSale = null;
        if (lastSale) {
           daysSinceLastSale = Math.floor((new Date() - lastSale) / 86400000);
        }
        result.push({ ...p, unitsSold: sold, daysSinceLastSale });
      }
    }
  }
  return result.sort((a, b) => a.unitsSold - b.unitsSold);
}

export function peakSalesBuckets(transactions, { start, end }, bucketBy) {
  const current = inRange(transactions, start, end);
  const spanMs = end - start;
  
  const numBuckets = bucketBy === 'day' ? Math.round(spanMs / 864e5) : bucketBy === 'week' ? Math.ceil(spanMs / (864e5 * 7)) : Math.ceil(spanMs / (864e5 * 30)) || 1;
  const buckets = Math.max(numBuckets, 1);
  const bucketMs = spanMs > 0 ? spanMs / buckets : 1;
  
  const series = Array.from({ length: buckets }, (_, i) => ({
    label: '',
    date: new Date(start.getTime() + i * bucketMs),
    revenue: 0,
    invoices: 0,
    isPeak: false
  }));
  
  for (const t of current) {
    const d = new Date(t.transactionDate);
    let i = Math.floor((d - start) / bucketMs);
    if (i === buckets && buckets > 0) i = buckets - 1;
    if (i >= 0 && i < buckets) {
      series[i].revenue += (t.total || 0);
      series[i].invoices += 1;
    }
  }
  
  let maxRev = -1;
  let peakIndex = -1;
  for (let i = 0; i < series.length; i++) {
    if (series[i].revenue > maxRev) {
      maxRev = series[i].revenue;
      peakIndex = i;
    }
  }
  if (peakIndex >= 0) {
    series[peakIndex].isPeak = true;
  }
  
  series.forEach(s => {
    if (bucketBy === 'day') {
      s.label = s.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } else if (bucketBy === 'week') {
      s.label = `Wk ${s.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    } else {
      s.label = s.date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
    }
  });
  
  return series;
}

export function orderStatusBreakdown(transactions, { start, end }) {
  const current = inRange(transactions, start, end);
  const statusCounts = new Map();
  
  for (const t of current) {
    let s = t.status || 'Order Placed';
    if (s === 'ORDER_PLACED') s = 'Order Placed';
    if (s === 'READY_FOR_PICKUP') s = 'Ready for Pickup';
    if (s === 'COMPLETED') s = 'Completed';
    if (s === 'CANCELLED') s = 'Cancelled';
    
    statusCounts.set(s, (statusCounts.get(s) || 0) + 1);
  }
  
  return Array.from(statusCounts.entries()).map(([name, count]) => ({
    name,
    count
  })).sort((a, b) => b.count - a.count);
}
