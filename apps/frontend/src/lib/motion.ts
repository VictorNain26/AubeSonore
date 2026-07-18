import { useReducedMotion, type Transition } from 'motion/react';

// Single source of truth for the app's motion tokens. Importing from
// here avoids divergent durations / eases drifting across components.

// Page entry: one orchestrated fade, sky and content together. No
// translation, no stagger — the light comes up, nothing slides in.
export const pageEntry: Transition = {
  duration: 0.6,
  ease: 'easeOut',
};

// Track flip (sh_id change): "mise au net" — ink drying into focus.
export const trackFlip: Transition = {
  duration: 0.25,
  ease: 'easeOut',
};

// Data tick (listeners count, etc.).
export const dataTick: Transition = {
  duration: 0.25,
  ease: 'easeOut',
};

// Toggle (like, play/stop): gentle spring with low overshoot.
export const toggle: Transition = {
  type: 'spring',
  stiffness: 320,
  damping: 22,
};

// Modal / banner in-out.
export const modal: Transition = {
  duration: 0.3,
  ease: 'easeOut',
};

// Track-flip variants: crossfade + slight blur, no translation. Blur is
// not covered by MotionConfig's reducedMotion, so the hook gates it.
export function useInkFlip() {
  const reduced = useReducedMotion();
  if (reduced) {
    return {
      initial: { opacity: 1 },
      animate: { opacity: 1 },
      exit: { opacity: 1 },
      transition: { duration: 0 } satisfies Transition,
    };
  }
  return {
    initial: { opacity: 0, filter: 'blur(3px)' },
    animate: { opacity: 1, filter: 'blur(0px)' },
    exit: { opacity: 0, filter: 'blur(3px)' },
    transition: trackFlip,
  };
}
