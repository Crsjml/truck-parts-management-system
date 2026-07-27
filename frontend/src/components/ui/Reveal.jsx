import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * Scroll-reveal wrapper. Fades and lifts a block into place the first time it
 * enters the viewport, then never animates again.
 */
export default function Reveal({ children, delay = 0, className = '' }) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.5, delay, ease: [0.23, 1, 0.32, 1] }}
    >
      {children}
    </motion.div>
  );
}
