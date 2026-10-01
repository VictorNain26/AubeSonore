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

// Library row removal: the list closes the gap with a height collapse.
export function useRowExit() {
  const reduced = useReducedMotion();
  if (reduced) {
    return {
      exit: { opacity: 0 },
      transition: { duration: 0 } satisfies Transition,
    };
  }
  return {
    exit: { height: 0, opacity: 0 },
    transition: { duration: 0.5, ease: easeSoft } satisfies Transition,
  };
}

// Rail entry ("Vient de passer"): soft fade + slight slide for the item
// that just arrived at the head of the rail.
export function useRailEntry() {
  const reduced = useReducedMotion();
  if (reduced) {
    return {
      initial: { opacity: 1 },
      animate: { opacity: 1 },
      transition: { duration: 0 } satisfies Transition,
    };
  }
  return {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.6, ease: easeSoft } satisfies Transition,
  };
}

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
    transition: { duration: 0.6, ease: easeSoft } satisfies Transition,
  };
}
