import { cn } from '../../utils/cn';

export default function ToggleChip({ active, onClick, children, className }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
        active ? 'bg-foreground text-background border-foreground' : 'bg-secondary text-muted-foreground border-border hover:bg-background',
        className
      )}
    >
      {children}
    </button>
  );
}
