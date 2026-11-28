// "PHP 1,234.50" style money for PDFs. jsPDF's built-in Helvetica cannot encode
// currency symbols such as the peso sign, so print the ISO code instead.
export function formatCurrencyCode(amount, currency = 'PHP') {
  const formatted = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency,
    currencyDisplay: 'code',
    minimumFractionDigits: 2
  }).format(Number.isFinite(Number(amount)) ? Number(amount) : 0);
  // Intl separates code and number with a non-breaking space.
  return formatted.replace(/ /g, ' ');
}
