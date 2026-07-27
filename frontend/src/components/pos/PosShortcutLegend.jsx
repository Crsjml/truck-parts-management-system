import React from 'react';
import { Keyboard } from '@phosphor-icons/react';

const SHORTCUTS = [
  { key: 'F2', action: 'Search parts' },
  { key: 'F4', action: 'Checkout' },
  { key: 'Esc', action: 'Clear / close' }
];

export default function PosShortcutLegend() {
  return (
    <div className="flex items-center gap-4 px-4 py-2.5 rounded-xl bg-secondary border border-border">
      <Keyboard weight="duotone" className="w-4 h-4 text-muted-foreground shrink-0" />
      <ul className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
        {SHORTCUTS.map(({ key, action }) => (
          <li key={key} className="flex items-center gap-2">
            <kbd className="px-2 py-0.5 rounded-md bg-background border border-border text-2xs font-mono font-bold text-foreground">
              {key}
            </kbd>
            <span className="text-xs text-muted-foreground">{action}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
