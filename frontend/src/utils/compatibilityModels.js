const createBlankRow = () => ({ brand: '', series: '', year: '' });

const normalizeRow = (row) => ({
  brand: String(row?.brand ?? '').trim(),
  series: String(row?.series ?? '').trim(),
  year: String(row?.year ?? '').trim()
});

export const normalizeCompatibilityRows = (value) => {
  if (Array.isArray(value)) {
    const normalized = value.map(normalizeRow).filter((row) => row.brand || row.series || row.year);
    return normalized.length > 0 ? normalized : [createBlankRow()];
  }

  if (typeof value === 'string') {
    const firstEntry = value.split(',').map((segment) => segment.trim()).find(Boolean) || '';
    if (!firstEntry) return [createBlankRow()];

    const tokens = firstEntry.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return [createBlankRow()];
    if (tokens.length === 1) return [{ brand: tokens[0], series: '', year: '' }];

    return [{ brand: tokens[0], series: tokens.slice(1).join(' '), year: '' }];
  }

  if (value && typeof value === 'object') {
    const row = normalizeRow(value);
    return row.brand || row.series || row.year ? [row] : [createBlankRow()];
  }

  return [createBlankRow()];
};

export const compatibilityRowsToPayload = (rows) =>
  (Array.isArray(rows) ? rows : [])
    .map(normalizeRow)
    .filter((row) => row.brand || row.series || row.year);

export const compatibilityRowsToSummary = (rows) =>
  compatibilityRowsToPayload(rows)
    .map((row) => [row.brand, row.series, row.year].filter(Boolean).join(' '))
    .join(', ');

// Legacy free-text fitment ("Isuzu ELF NPR, Hino 500") as rows: first word is the make.
const legacyTextToRows = (text) =>
  String(text ?? '')
    .split(/[,;\n]/)
    .map((entry) => entry.trim().split(/\s+/).filter(Boolean))
    .filter((tokens) => tokens.length > 0)
    .map(([brand, ...rest]) => ({ brand, series: rest.join(' '), year: '' }));

/**
 * Compact catalogue fitment line for a part.
 * Groups fitment by make: "Isuzu Forward/Giga" plus `more` for the other makes.
 * Returns null when the part has no fitment at all.
 */
export const fitmentSummary = (part) => {
  const stored = compatibilityRowsToPayload(part?.compatibleWith);
  const rows = stored.length > 0 ? stored : compatibilityRowsToPayload(legacyTextToRows(part?.compatibility));
  if (rows.length === 0) return null;

  const makes = [];
  const seriesByMake = new Map();
  rows.forEach((row) => {
    const make = row.brand || row.series || row.year;
    const key = make.toLowerCase();
    if (!seriesByMake.has(key)) {
      makes.push(make);
      seriesByMake.set(key, []);
    }
    const series = row.brand ? row.series : '';
    const list = seriesByMake.get(key);
    if (series && !list.some((s) => s.toLowerCase() === series.toLowerCase())) list.push(series);
  });

  const [firstMake] = makes;
  const firstSeries = seriesByMake.get(firstMake.toLowerCase());
  const label = firstSeries.length > 0 ? `${firstMake} ${firstSeries.join('/')}` : firstMake;
  const full = stored.length > 0 ? compatibilityRowsToSummary(stored) : String(part.compatibility).trim();
  return { label, more: makes.length - 1, full };
};
