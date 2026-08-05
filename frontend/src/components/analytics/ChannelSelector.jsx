import React from 'react';

const CHANNELS = [
  { key: 'all', label: 'All' },
  { key: 'store', label: 'In-Store' },
  { key: 'online', label: 'Online' }
];

export default function ChannelSelector({ selectedChannel, onSelectChannel }) {
  return (
    <div className="flex bg-secondary p-1 rounded-lg w-max border border-border">
      {CHANNELS.map((channel) => {
        const isActive = selectedChannel === channel.key;
        return (
          <button
            key={channel.key}
            onClick={() => onSelectChannel(channel.key)}
            aria-pressed={isActive}
            className={`
              px-3 py-1.5 text-xs font-semibold rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-brandBlue-500/50
              ${isActive 
                ? 'bg-background text-brandBlue-600 dark:text-brandBlue-400 border border-border' 
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
