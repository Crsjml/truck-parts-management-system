import React from 'react';
import { toLocalDateKey } from '../../utils/localDate';

export default function DateRangePicker({ start, end, onChange }) {
  const today = toLocalDateKey();

  const handleStartChange = (e) => {
    const newStart = e.target.value;
    if (newStart && end && newStart > end) {
      onChange({ start: newStart, end: newStart });
    } else {
      onChange({ start: newStart, end });
    }
  };

  const handleEndChange = (e) => {
    const newEnd = e.target.value;
    if (start && newEnd && newEnd < start) {
      onChange({ start: newEnd, end: newEnd });
    } else {
      onChange({ start, end: newEnd });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        aria-label="Start date"
        max={today}
        value={start || ''}
        onChange={handleStartChange}
        className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-background transition-colors"
      />
      <span className="text-muted-foreground text-sm">to</span>
      <input
        type="date"
        aria-label="End date"
        max={today}
        value={end || ''}
        onChange={handleEndChange}
        className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-background transition-colors"
      />
    </div>
  );
}
