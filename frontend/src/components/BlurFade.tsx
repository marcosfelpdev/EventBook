import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface BlurFadeProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function BlurFade({ children, className, delay = 0 }: BlurFadeProps) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 12, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: reduced ? 0 : 0.5, delay: reduced ? 0 : delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
