// Motion helpers shared by every page. Motion is vendored (shared/vendor/motion.js)
// so the site stays static and works offline. All effects are skipped when the
// visitor prefers reduced motion.
import { animate, stagger, hover, press } from './vendor/motion.js';

export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const spring = { type: 'spring', stiffness: 520, damping: 22 };
export { stagger };

export function play(targets, keyframes, options) {
  if (reduced) return null;
  return animate(targets, keyframes, options);
}

// Spring hover and press feedback for pointer and keyboard users.
export function interactive(selector, { lift = 1.04, sink = 0.95 } = {}) {
  if (reduced) return;
  hover(selector, (el) => {
    if (el.disabled) return;
    animate(el, { scale: lift }, spring);
    return () => animate(el, { scale: 1 }, spring);
  });
  press(selector, (el) => {
    if (el.disabled) return;
    animate(el, { scale: sink }, { duration: 0.12 });
    return () => animate(el, { scale: 1 }, spring);
  });
}

// Fade and rise the given elements in one after another.
export function rise(targets, { gap = 0.06, from = 18 } = {}) {
  return play(targets, { opacity: [0, 1], y: [from, 0] }, {
    delay: stagger(gap),
    duration: 0.55,
    ease: [0.22, 1, 0.36, 1],
  });
}
