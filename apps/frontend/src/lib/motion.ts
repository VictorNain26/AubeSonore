import type { Transition } from 'motion/react';

// Single source of truth for the app's motion tokens. Importing from
// here avoids divergent durations / eases drifting across components, and
// makes it cheap to retune the whole app from one place.

// Track flip (sh_id change): anything tied to the current track does a
// soft crossfade with a slight upward slide. ease-out-cubic feels calm
// without being slow.
export const trackFlip: Transition = {
  duration: 0.45,
  ease: [0.22, 1, 0.36, 1],
};

// Data tick (listeners count, etc.): short crossfade so a digit change
// is felt as a soft swap rather than a hard substitution.
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

// Single press depth for every whileTap gesture.
export const pressScale = 0.92;

// Cascade step: page entry and track flips reveal their blocks in
// sequence (artwork → title → artist → …), one beat apart.
export const stagger = 0.08;
