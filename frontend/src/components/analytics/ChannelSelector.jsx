import React from 'react';

const CHANNELS = [
  { key: 'all', label: 'All' },
  { key: 'store', label: 'In-Store' },
  { key: 'online', label: 'Online' }
];

export default function ChannelSelector({ selectedChannel, onSelectChannel }) {
  return (
    <div className="flex bg-secondary/50 p-1 rounded-xl glass-panel w-max border border-border/50">
      {CHANNELS.map((channel) => {
        const isActive = selectedChannel === channel.key;
        return (
          <button
            key={channel.key}
            onClick={() => onSelectChannel(channel.key)}
            aria-pressed={isActive}
            className={`
              px-4 py-1.5 text-xs font-semibold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/50
              ${isActive 
                ? 'bg-amber-500 text-amber-950 shadow-sm' 
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }
            `}
          >
            {channel.label}
          </button>
        );
      })}
    </div>
  );
}
