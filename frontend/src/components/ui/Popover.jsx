import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

function PopoverPanel({
  onClose,
  triggerRef,
  children,
  className = '',
  labelledBy
}) {
  const panelRef = useRef(null);
  const reduceMotion = useReducedMotion();
  const [coords, setCoords] = useState({ top: -9999, right: 0, left: 'auto' });

  // Kept current every render
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const updatePosition = () => {
      if (!triggerRef.current || !panelRef.current) return;
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const panelRect = panelRef.current.getBoundingClientRect();
      
      let top = triggerRect.bottom + 8;
      let right = window.innerWidth - triggerRect.right;
      let left = 'auto';

      // Flip logic: if panel overflows bottom viewport
      if (top + panelRect.height > window.innerHeight) {
        // If it fits above, flip it up. Otherwise, keep it at top but maybe adjust
        if (triggerRect.top - panelRect.height - 8 > 0) {
          top = triggerRect.top - panelRect.height - 8;
        }
      }
      
      // If it overflows left (since right is fixed to trigger right)
      if (triggerRect.right - panelRect.width < 0) {
        right = 'auto';
        left = 8; // small padding
      }
      
      setCoords({ top, right, left });
    };

    requestAnimationFrame(updatePosition);

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [triggerRef]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
      }
    };

    const handleOutsideClick = (e) => {
      if (!panelRef.current) return;
      if (panelRef.current.contains(e.target)) return;
      if (triggerRef.current && triggerRef.current.contains(e.target)) return;
      onCloseRef.current();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [triggerRef]);

  // Focus management and Focus Trap
  useEffect(() => {
    const triggerEl = triggerRef.current;
    
    // Focus the panel when it opens
    if (panelRef.current) {
      panelRef.current.focus({ preventScroll: true });
    }

    const handleTabKey = (e) => {
      if (e.key === 'Tab' && panelRef.current) {
        const focusableElements = panelRef.current.querySelectorAll(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement || document.activeElement === panelRef.current) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);

    // Return focus when the panel unmounts (closes)
    return () => {
      document.removeEventListener('keydown', handleTabKey);
      if (triggerEl && document.body.contains(triggerEl)) {
        setTimeout(() => {
          triggerEl.focus();
        }, 0);
      }
    };
  }, [triggerRef]);

  const panelTransition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.18, ease: 'easeOut' };

  return createPortal(
    <motion.div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      aria-labelledby={labelledBy}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -5 }}
      animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -5 }}
      transition={panelTransition}
      className={`fixed z-50 pointer-events-auto focus:outline-none ${className}`}
      style={{
        top: coords.top !== -9999 ? coords.top : -9999,
        right: coords.right,
        left: coords.left,
      }}
    >
      {children}
    </motion.div>,
    document.body
  );
}

export function Popover({ isOpen, ...rest }) {
  return <AnimatePresence>{isOpen && <PopoverPanel {...rest} />}</AnimatePresence>;
}
