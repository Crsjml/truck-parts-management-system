export default function NavToggle({ items, activeId, onSelect }) {
  return (
    <nav
      aria-label="Primary"
      className="flex flex-wrap items-center justify-center gap-1 rounded-lg border border-border/50 bg-secondary/50 p-1 lg:flex-nowrap"
    >
      {items.map((item) => {
        const isActive = activeId === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
              isActive
                ? 'border border-border/50 bg-background text-foreground shadow-sm'
                : 'border border-transparent text-muted-foreground hover:bg-background/50 hover:text-foreground'
            }`}
          >
            <item.icon weight={isActive ? 'fill' : 'duotone'} className="h-4 w-4" />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
