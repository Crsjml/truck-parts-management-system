import { Heart } from '@phosphor-icons/react';

export const SaveHeartButton = ({ isSaved, onToggle, isPending, size = 24 }) => {
  const handleClick = async (e) => {
    e.stopPropagation();
    onToggle();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={isSaved}
      aria-label={isSaved ? 'Remove from saved' : 'Save for later'}
      className="p-2 rounded-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
    >
      <Heart
        size={size}
        weight={isSaved ? 'fill' : 'duotone'}
        className={`transition-colors ${
          isSaved ? 'text-accent' : 'text-muted-foreground hover:text-foreground'
        }`}
      />
    </button>
  );
};
