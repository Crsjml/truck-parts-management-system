// Single source of truth for order-status colour tones, shared by the
// Analytics ledger, the Daily Sales Summary and the Overview status chart so
// they cannot drift. Order Placed is the only status that needs staff action,
// so it gets the one attention tone (amber) instead of a muted grey.
const STATUS_LABELS = {
  ORDER_PLACED: 'Order Placed',
  READY_FOR_PICKUP: 'Ready for Pickup',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
};

export function normalizeOrderStatus(status) {
  return STATUS_LABELS[status] || status || 'Order Placed';
}

const STATUS_TONES = {
  Completed: 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
  'Ready for Pickup': 'text-brandBlue-700 dark:text-brandBlue-300 bg-brandBlue-500/10 border-brandBlue-500/30',
  Cancelled: 'text-brandRed-700 dark:text-brandRed-300 bg-brandRed-500/10 border-brandRed-500/30',
  'Order Placed': 'text-amber-800 dark:text-amber-300 bg-amber-500/15 border-amber-500/40'
};

export function getStatusTone(status) {
  return STATUS_TONES[normalizeOrderStatus(status)] || STATUS_TONES['Order Placed'];
}

// Chart fills per status label. Amber matches the Order Placed chip above.
const STATUS_CHART_COLORS = {
  Completed: 'hsl(var(--chart-2))',
  'Ready for Pickup': 'hsl(var(--chart-1))',
  Cancelled: 'hsl(var(--chart-danger))',
  'Order Placed': 'hsl(var(--chart-4))'
};

export function getStatusChartColor(status) {
  return STATUS_CHART_COLORS[normalizeOrderStatus(status)] || STATUS_CHART_COLORS['Order Placed'];
}
