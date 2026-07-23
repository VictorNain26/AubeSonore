import { useReducedMotion, type Transition } from 'motion/react';

// Single source of truth for the app's motion tokens. Importing from
// here avoids divergent durations / eases drifting across components.

// Shared easing — the same curve as CSS `--ease-out-quart`: a soft,
// enveloping ease-out, no overshoot. One easing across the whole site.
const easeSoft: [number, number, number, number] = [0.2, 0, 0, 1];

// Page entry: one orchestrated fade, sky and content together. No
// translation, no stagger — the light comes up, nothing slides in.
export const pageEntry: Transition = {
  duration: 0.7,
  ease: easeSoft,
};

// Toggle (like): gentle, well-damped spring — barely any overshoot.
export const toggle: Transition = {
  type: 'spring',
  stiffness: 260,
  damping: 30,
};

// Modal / banner in-out.
export const modal: Transition = {
  duration: 0.45,
  ease: easeSoft,
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
    transition: { duration: 0.35, ease: easeSoft } satisfies Transition,
  };
}
