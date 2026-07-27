export const PERIODS = [
  { key: '7d', label: 'Last 7 Days', bucket: 'day', spanMs: 7 * 864e5, comparable: true },
  { key: '30d', label: 'Last 30 Days', bucket: 'week', spanMs: 30 * 864e5, comparable: true },
  { key: 'all', label: 'All Time', bucket: 'month', spanMs: 0, comparable: false }
];

export const PAYMENT_METHODS = ['CASH', 'CARD', 'CHEQUE', 'BANK_TRANSFER'];
export const PAYMENT_COLORS = { CASH: '#059669', CARD: '#3b82f6', CHEQUE: '#d97706', BANK_TRANSFER: '#8b5cf6' };
export const PAYMENT_LABELS = { CASH: 'Cash', CARD: 'Card', CHEQUE: 'Cheque', BANK_TRANSFER: 'Transfer' };

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
  const { start, bucket, comparable, spanMs } = range;
  
  const numBuckets = bucket === 'day' ? Math.round(spanMs / 864e5) : bucket === 'week' ? Math.ceil(spanMs / (864e5 * 7)) : Math.ceil(spanMs / (864e5 * 30)) || 1;
  const buckets = Math.max(numBuckets, 1);
  const bucketMs = spanMs > 0 ? spanMs / buckets : 1;
  
  const series = Array.from({ length: buckets }, (_, i) => ({
    label: `Bucket ${i}`,
    revenue: 0,
    prior: comparable ? 0 : null
  }));
  
  for (const t of current) {
    const d = new Date(t.transactionDate);
    const i = Math.floor((d - start) / bucketMs);
    if (i >= 0 && i < buckets) series[i].revenue += (t.total || 0);
  }
  
  if (comparable) {
    for (const t of previous) {
      const d = new Date(t.transactionDate);
      const i = Math.floor((d - (start.getTime() - spanMs)) / bucketMs);
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
  const { start, spanMs, bucket } = range;
  const numBuckets = bucket === 'day' ? Math.round(spanMs / 864e5) : bucket === 'week' ? Math.ceil(spanMs / (864e5 * 7)) : Math.ceil(spanMs / (864e5 * 30)) || 1;
  const buckets = Math.max(numBuckets, 1);
  const bucketMs = spanMs > 0 ? spanMs / buckets : 1;
  
  const series = Array.from({ length: buckets }, (_, i) => {
    const row = { label: `Bucket ${i}` };
    PAYMENT_METHODS.forEach(m => row[m] = 0);
    return row;
  });
  
  for (const t of transactions) {
    let m = t.paymentMethod;
    if (!PAYMENT_METHODS.includes(m)) m = 'CASH';
    
    const d = new Date(t.transactionDate);
    const i = Math.floor((d - start) / bucketMs);
    if (i >= 0 && i < buckets) {
      series[i][m] += (t.total || 0);
    }
  }
  
  return series;
}
