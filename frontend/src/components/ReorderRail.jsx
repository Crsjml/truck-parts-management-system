import React, { useMemo } from 'react';
import { ArrowRight, ArrowClockwise, Plus, SignIn } from '@phosphor-icons/react';
import { getCategoryPlaceholder } from '../utils/categoryIcons';
import Reveal from './ui/Reveal';

const MAX_TILES = 8;

function useRecentlyBought(transactions, parts) {
  return useMemo(() => {
    if (!transactions?.length || !parts?.length) return [];

    const partsById = new Map(parts.map((part) => [part.id, part]));
    const seen = new Set();
    const result = [];

    for (const transaction of transactions) {
      for (const item of transaction.items ?? []) {
        const partId = item.partId || item.id;
        if (!partId || seen.has(partId)) continue;
        seen.add(partId);

        const part = partsById.get(partId);
        if (part) result.push(part);
        if (result.length >= MAX_TILES) return result;
      }
    }
    return result;
  }, [transactions, parts]);
}

function EmptyLine({ icon: Icon, message, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-[2rem] border border-border/50 bg-secondary/40 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
        <Icon weight="duotone" className="h-5 w-5 shrink-0 text-accent" />
        {message}
      </p>
      <button
        onClick={onAction}
        className="inline-flex shrink-0 items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-xs font-bold text-background transition-transform duration-200 ease-out active:scale-[0.97]"
      >
        {actionLabel}
        <ArrowRight weight="bold" className="h-3 w-3" />
      </button>
    </div>
  );
}

export default function ReorderRail({
  transactions,
  parts,
  customerSession,
  addToCart,
  formatCurrency,
  onBrowseCatalog,
  onSignIn,
}) {
  const recentlyBought = useRecentlyBought(transactions, parts);

  if (!customerSession) {
    return (
      <Reveal>
        <EmptyLine
          icon={SignIn}
          message="Sign in to reorder anything you have bought before."
          actionLabel="Sign in"
          onAction={onSignIn}
        />
      </Reveal>
    );
  }

  if (recentlyBought.length === 0) {
    return (
      <Reveal>
        <EmptyLine
          icon={ArrowClockwise}
          message="Your past orders will show up here for one-tap reordering."
          actionLabel="Browse the catalog"
          onAction={onBrowseCatalog}
        />
      </Reveal>
    );
  }

  return (
    <Reveal>
      <section aria-labelledby="reorder-heading" className="w-full">
        <div className="mb-5 flex items-baseline justify-between gap-4">
          <h2 id="reorder-heading" className="text-2xl font-bold tracking-tight text-foreground">
            Order again
          </h2>
          <button
            onClick={onBrowseCatalog}
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
          >
            All parts
            <ArrowRight weight="bold" className="h-3 w-3" />
          </button>
        </div>

        <ul className="hide-scrollbar scroll-fade-edges flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
          {recentlyBought.map((part) => {
            const availableStock = part.stock - (part.reservedStock || 0);
            const isOutOfStock = availableStock <= 0;

            return (
              <li
                key={part.id}
                data-testid="reorder-tile"
                className="flex w-[210px] shrink-0 snap-start flex-col gap-3 rounded-3xl border border-border/40 bg-background/60 p-4 backdrop-blur-sm transition-colors duration-300 hover:border-accent/30"
              >
                <div className="flex h-24 items-center justify-center overflow-hidden rounded-2xl bg-secondary/60">
                  <img
                    src={part.image || getCategoryPlaceholder(part.category)}
                    alt=""
                    width={168}
                    height={96}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="min-h-[2.5rem]">
                  <p className="line-clamp-2 text-sm font-bold leading-snug text-foreground">{part.name}</p>
                </div>

                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-bold text-foreground">{formatCurrency(part.price)}</span>
                  <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">
                    {isOutOfStock ? 'None left' : `${availableStock} left`}
                  </span>
                </div>

                <button
                  onClick={() => addToCart(part, 1)}
                  disabled={isOutOfStock}
                  aria-label={isOutOfStock ? `${part.name} is out of stock` : `Add ${part.name} to cart`}
                  className="inline-flex min-h-[2.25rem] w-full items-center justify-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-bold text-background transition-transform duration-200 ease-out active:scale-[0.97] disabled:cursor-not-allowed disabled:bg-secondary disabled:text-muted-foreground disabled:active:scale-100"
                >
                  {isOutOfStock ? (
                    'Out of stock'
                  ) : (
                    <>
                      <Plus weight="bold" className="h-3 w-3" />
                      Add
                    </>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </Reveal>
  );
}
