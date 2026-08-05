import { cn } from '../../utils/cn';

const variants = {
  default:     { active: 'bg-foreground     text-background           border-foreground     hover:bg-foreground/90',      inactive: 'bg-secondary text-muted-foreground border-border hover:bg-muted hover:text-foreground' },
  primary:     { active: 'bg-primary        text-primary-foreground   border-primary        hover:bg-primary/90',         inactive: 'bg-secondary text-muted-foreground border-border hover:bg-primary/10 hover:text-primary hover:border-primary/40' },
  destructive: { active: 'bg-destructive    text-destructive-foreground border-destructive  hover:bg-destructive/90',     inactive: 'bg-secondary text-muted-foreground border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40' },
  accent:      { active: 'bg-accent         text-accent-foreground    border-accent         hover:bg-accent/90',          inactive: 'bg-secondary text-muted-foreground border-border hover:bg-accent/10 hover:text-accent hover:border-accent/40' },
};

export default function ToggleChip({ active, onClick, children, className, variant = 'default' }) {
  const v = variants[variant] ?? variants.default;
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
        active ? v.active : v.inactive,
        className
      )}
    >
      {children}
    </button>
  );
}
