'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * ArShield's Reveal: motion.div fade-up on scroll-into-view.
 * initial { opacity: 0, y: 20 } → whileInView { opacity: 1, y: 0 }
 * duration 0.6, ease cubic [0.22, 1, 0.36, 1], once, margin -80px.
 */
export function Reveal({
  children,
  delay = 0,
  y = 20,
  once = true,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  once?: boolean;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: '-80px' }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Smaller fade-up used for hero items (y: 10, duration .5). */
export function HeroItem({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}