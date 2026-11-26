// Single source of truth for order-status colour tones, shared by the
// Analytics ledger and the Daily Sales Summary so the two cannot drift.
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
  'Order Placed': 'text-muted-foreground bg-secondary border-border'
};

export function getStatusTone(status) {
  return STATUS_TONES[normalizeOrderStatus(status)] || STATUS_TONES['Order Placed'];
}
