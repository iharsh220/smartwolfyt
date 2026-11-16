import { reducedMotion } from '../core/utils.js';

/** 3D tilt + glare on any `.tilt` element (desktop pointers only). */
export function initTilt() {
  if (reducedMotion() || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  let current = null;

  const reset = (el) => {
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  };

  document.addEventListener(
    'pointermove',
    (e) => {
      const el = e.target.closest?.('.tilt');
      if (current && current !== el) reset(current);
      current = el;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty('--rx', `${(-y * 8).toFixed(2)}deg`);
      el.style.setProperty('--ry', `${(x * 10).toFixed(2)}deg`);
      el.style.setProperty('--mx', `${((x + 0.5) * 100).toFixed(1)}%`);
      el.style.setProperty('--my', `${((y + 0.5) * 100).toFixed(1)}%`);
    },
    { passive: true },
  );
  document.addEventListener('pointerleave', () => current && reset(current));
}
