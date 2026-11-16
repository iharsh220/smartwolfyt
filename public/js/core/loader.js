/**
 * Full-screen loader shown until the channel + videos data is ready.
 * Markup lives at the top of <body> in index.html so it is visible instantly.
 */
const MAX_WAIT_MS = 15_000; // never trap the visitor behind the loader

const el = () => document.getElementById('loader');
let finished = false;

export function loaderStep(text, percent) {
  if (finished) return;
  const step = document.getElementById('loaderStep');
  const bar = document.getElementById('loaderBar');
  if (step) step.textContent = text;
  if (bar) bar.style.width = `${percent}%`;
}

export function hideLoader() {
  if (finished) return;
  finished = true;
  loaderStep('Ready!', 100);
  const node = el();
  document.body.classList.remove('is-loading');
  if (!node) return;
  node.classList.add('done');
  node.addEventListener('transitionend', () => node.remove(), { once: true });
  setTimeout(() => node.remove(), 1000); // in case transitions are disabled
}

/** Resolves when an <img> has loaded (or failed), or after `ms` — whichever comes first. */
export function imageReady(img, ms = 2500) {
  if (!img || (img.complete && img.naturalWidth)) return Promise.resolve();
  return Promise.race([
    new Promise((resolve) => {
      img.addEventListener('load', resolve, { once: true });
      img.addEventListener('error', resolve, { once: true });
    }),
    new Promise((resolve) => setTimeout(resolve, ms)),
  ]);
}

setTimeout(hideLoader, MAX_WAIT_MS);
