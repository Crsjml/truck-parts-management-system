import { useRef } from 'react';
import { X } from '@phosphor-icons/react';
import Logo from '../Logo';
import { useDialogFocus } from '../../hooks/useDialogFocus';

const CLOSE_SELECTOR = '[data-drawer-close]';

/**
 * Mobile staff navigation as a modal dialog: focus moves to the close button
 * on open, Tab stays inside, Escape or the backdrop closes it, and focus goes
 * back to the menu button that opened it.
 */
export default function MobileNavDrawer({ isOpen, onClose, children, footer = null }) {
  const dialogRef = useRef(null);
  useDialogFocus(dialogRef, { isOpen, onClose, initialFocus: CLOSE_SELECTOR });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex lg:hidden bg-black/60 backdrop-blur-sm">
      <aside
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className="w-72 bg-background border-r border-border flex flex-col justify-between overflow-hidden animate-slideRight"
      >
        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 hide-scrollbar">
          <div className="flex items-center justify-between py-2 border-b border-border">
            <Logo className="w-12 h-12" showText={true} />
            <button
              type="button"
              data-drawer-close
              onClick={onClose}
              aria-label="Close navigation menu"
              className="p-1.5 bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X weight="duotone" className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
          {children}
        </div>
        {footer}
      </aside>

      <div className="flex-1" data-testid="mobile-nav-backdrop" aria-hidden="true" onClick={onClose} />
    </div>
  );
}
