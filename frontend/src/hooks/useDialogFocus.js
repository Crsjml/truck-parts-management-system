import { useEffect, useRef } from 'react';

const FOCUSABLE = [
  'button:not(:disabled)',
  'input:not(:disabled)',
  'select:not(:disabled)',
  'textarea:not(:disabled)',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])'
].join(', ');

/**
 * Modal-dialog keyboard behaviour: locks page scroll, moves focus into the
 * dialog, traps Tab inside it, closes on Escape, and hands focus back to
 * whatever opened it when the dialog goes away.
 *
 * onClose is read through a ref so an inline arrow prop does not re-run the
 * effect (which would yank focus back to the first field on every render).
 */
export function useDialogFocus(dialogRef, { isOpen = true, onClose, initialFocus = FOCUSABLE } = {}) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const dialog = dialogRef.current;
    (dialog?.querySelector(initialFocus) || dialog?.querySelector(FOCUSABLE))?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }
      if (event.key !== 'Tab') return;
      const controls = dialogRef.current?.querySelectorAll(FOCUSABLE);
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus?.();
    };
  }, [isOpen, dialogRef, initialFocus]);
}
