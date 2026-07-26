import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

// ponytail: no focus-trap dependency (Radix / Headless UI / focus-trap-react)
// is installed in this project (checked package.json), so this hand-rolls the
// minimum correct trap rather than adding a dependency for one component.
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Module-level so a drawer closing while another is still open (or the same
// drawer closing and reopening faster than its own exit transition) doesn't
// un-inert the background or steal focus out from under the drawer that's
// still meant to be modal. Only the transition to/from zero open drawers
// touches the DOM.
let openDrawerCount = 0;
let sharedInertedEls = [];

function DrawerPanel({
  onClose,
  labelledBy,
  describedBy,
  children,
  wrapperClassName = '',
  panelClassName = '',
  panelStyle,
  overlayClassName = '',
  panelVariants,
  initialFocusRef,
  closeOnOverlayClick = true,
}) {
  const panelRef = useRef(null);
  const wrapperRef = useRef(null);
  const previouslyFocusedRef = useRef(null);
  const reduceMotion = useReducedMotion();

  // Kept current every render so the mount-effect below can always call the
  // latest onClose without re-running its focus/inert setup (which must only
  // run once per mount, not on every parent re-render that hands in a new
  // inline `onClose` closure).
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement;

    const toFocus =
      initialFocusRef?.current ||
      panelRef.current?.querySelector(FOCUSABLE_SELECTOR) ||
      panelRef.current;
    toFocus?.focus();

    openDrawerCount += 1;
    if (openDrawerCount === 1) {
      sharedInertedEls = Array.from(document.body.children).filter(
        (el) => el !== wrapperRef.current
      );
      sharedInertedEls.forEach((el) => {
        el.inert = true;
      });
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll(FOCUSABLE_SELECTOR)
      ).filter((el) => el.offsetParent !== null);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      openDrawerCount = Math.max(0, openDrawerCount - 1);
      // Only the last drawer to close un-inerts the background and restores
      // focus -- if another drawer is still open (or this one closed and
      // reopened before its exit finished), that drawer still owns the page.
      if (openDrawerCount === 0) {
        sharedInertedEls.forEach((el) => {
          el.inert = false;
        });
        sharedInertedEls = [];
        previouslyFocusedRef.current?.focus?.();
      }
    };
    // Intentionally run once per mount: this sets up the initial focus,
    // inert-count, and Tab/Escape listener for the lifetime of this panel
    // instance. onClose is read via onCloseRef (kept fresh above) specifically
    // so a new inline onClose from the caller doesn't re-run this and steal
    // focus back to the first focusable element on every parent re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const overlayTransition = { duration: reduceMotion ? 0 : 0.3 };
  const panelTransition = reduceMotion
    ? { duration: 0 }
    : (panelVariants?.transition ?? { duration: 0.4, ease: [0.32, 0.72, 0, 1] });

  return createPortal(
    <div ref={wrapperRef} className={`fixed inset-0 z-50 pointer-events-none ${wrapperClassName}`}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={overlayTransition}
        className={`fixed inset-0 pointer-events-auto ${overlayClassName}`}
        onClick={closeOnOverlayClick ? onClose : undefined}
      />
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        initial={reduceMotion ? { opacity: 0 } : (panelVariants?.initial ?? { opacity: 0 })}
        animate={reduceMotion ? { opacity: 1 } : (panelVariants?.animate ?? { opacity: 1 })}
        exit={reduceMotion ? { opacity: 0 } : (panelVariants?.exit ?? { opacity: 0 })}
        transition={panelTransition}
        className={`pointer-events-auto relative ${panelClassName}`}
        style={panelStyle}
      >
        {children}
      </motion.div>
    </div>,
    document.body
  );
}

/**
 * Accessible drawer/dialog primitive: dialog semantics, focus trap, focus
 * restoration, Escape-to-close, and an inert background. Positioning and
 * visual treatment are fully caller-controlled via the *ClassName props so
 * this can be a full-height edge panel or a compact floating panel alike.
 */
export function Drawer({ isOpen, ...rest }) {
  return <AnimatePresence>{isOpen && <DrawerPanel {...rest} />}</AnimatePresence>;
}
