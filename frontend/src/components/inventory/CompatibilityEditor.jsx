import React, { useId } from 'react';
import { Plus, Trash } from '@phosphor-icons/react';

export default function CompatibilityEditor({ rows = [], onChange, mode = 'add' }) {
  const baseId = useId();
  const safeRows = Array.isArray(rows) && rows.length > 0 ? rows : [{ brand: '', series: '', year: '' }];
  const isEdit = mode === 'edit';

  const updateRow = (index, field, value) => {
    onChange(
      safeRows.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row))
    );
  };

  const addRow = () => {
    onChange([...safeRows, { brand: '', series: '', year: '' }]);
  };

  const removeRow = (index) => {
    if (safeRows.length === 1) return;
    onChange(safeRows.filter((_, rowIndex) => rowIndex !== index));
  };

  return (
    <div className={isEdit ? 'space-y-3' : 'space-y-3'}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className={isEdit ? 'text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground' : 'text-xs font-semibold uppercase tracking-wider text-muted-foreground'}>
            Vehicle Compatibility
          </p>
          <p className={isEdit ? 'max-w-xl text-[11px] leading-relaxed text-muted-foreground' : 'text-xs text-muted-foreground'}>
            Add one row per fitment. Leave rows blank if the part is universal or the fitment is still being confirmed.
          </p>
        </div>
        <button
          type="button"
          onClick={addRow}
          className={isEdit ? 'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground transition-colors hover:bg-secondary' : 'inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-background'}
        >
          <Plus className="w-3.5 h-3.5" />
          {isEdit ? 'Add' : 'Add Row'}
        </button>
      </div>

      <div className={isEdit ? 'space-y-2 rounded-xl border border-border/70 bg-secondary/30 p-2.5' : 'space-y-2'}>
        {safeRows.map((row, index) => {
          const rowPrefix = `${baseId}-${index}`;
          return (
            <div key={rowPrefix} className={isEdit ? 'grid grid-cols-1 gap-2 lg:grid-cols-[0.9fr_minmax(0,1.45fr)_0.8fr_auto] lg:items-end' : 'grid grid-cols-1 gap-2 md:grid-cols-[1.1fr_1.4fr_0.9fr_auto] md:items-end'}>
              <div className="space-y-1">
                <label htmlFor={`${rowPrefix}-brand`} className={isEdit ? 'text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground' : 'text-2xs font-bold uppercase tracking-wider text-muted-foreground'}>
                  Brand
                </label>
                <input
                  id={`${rowPrefix}-brand`}
                  type="text"
                  value={row.brand}
                  onChange={(e) => updateRow(index, 'brand', e.target.value)}
                  placeholder="e.g. Isuzu"
                  className={isEdit ? 'h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-brandBlue-500 focus:outline-none' : 'w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brandBlue-500 focus:outline-none'}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor={`${rowPrefix}-series`} className={isEdit ? 'text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground' : 'text-2xs font-bold uppercase tracking-wider text-muted-foreground'}>
                  Series / Model
                </label>
                <input
                  id={`${rowPrefix}-series`}
                  type="text"
                  value={row.series}
                  onChange={(e) => updateRow(index, 'series', e.target.value)}
                  placeholder="e.g. ELF NPR"
                  className={isEdit ? 'h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-brandBlue-500 focus:outline-none' : 'w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brandBlue-500 focus:outline-none'}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor={`${rowPrefix}-year`} className={isEdit ? 'text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground' : 'text-2xs font-bold uppercase tracking-wider text-muted-foreground'}>
                  Years
                </label>
                <input
                  id={`${rowPrefix}-year`}
                  type="text"
                  value={row.year}
                  onChange={(e) => updateRow(index, 'year', e.target.value)}
                  placeholder="e.g. 1998-2005"
                  className={isEdit ? 'h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-brandBlue-500 focus:outline-none' : 'w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brandBlue-500 focus:outline-none'}
                />
              </div>
              <button
                type="button"
                onClick={() => removeRow(index)}
                disabled={safeRows.length === 1}
                aria-label={`Remove compatibility row ${index + 1}`}
                className={isEdit ? 'inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-3 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50' : 'inline-flex h-10 items-center justify-center rounded-xl border border-border bg-secondary px-3 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50'}
              >
                <Trash className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {mode === 'add' && (
        <p className="text-2xs text-muted-foreground">
          Keep the fitment rows short and specific. The same structure is shared with edit mode.
        </p>
      )}
    </div>
  );
}
