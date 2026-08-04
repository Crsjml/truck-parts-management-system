import React from 'react';

export default function DateRangePicker({ start, end, onChange }) {
  const today = new Date().toISOString().split('T')[0];

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
        max={today}
        value={start || ''}
        onChange={handleStartChange}
        className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:glowing-blue-border transition-colors"
      />
      <span className="text-muted-foreground text-sm">to</span>
      <input
        type="date"
        max={today}
        value={end || ''}
        onChange={handleEndChange}
        className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:glowing-blue-border transition-colors"
      />
    </div>
  );
}
