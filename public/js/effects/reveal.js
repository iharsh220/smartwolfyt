import { $$, num, reducedMotion } from '../core/utils.js';

const io = 'IntersectionObserver' in window
  ? new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    )
  : null;

/** Fade/slide in every `.reveal` that hasn't been observed yet. Call after rendering new HTML. */
export function reveal(root = document) {
  for (const el of $$('.reveal:not([data-rv])', root)) {
    el.dataset.rv = '1';
    if (io && !reducedMotion()) io.observe(el);
    else el.classList.add('in');
  }
}

/** Animate a number from 0 → target with an ease-out curve. */
export function countUp(el, target, format = num, ms = 1400) {
  if (reducedMotion()) {
    el.textContent = format(target);
    return;
  }
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / ms);
    const eased = 1 - Math.pow(1 - t, 4);
    el.textContent = format(target * eased);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
