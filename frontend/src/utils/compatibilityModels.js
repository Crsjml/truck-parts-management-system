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
