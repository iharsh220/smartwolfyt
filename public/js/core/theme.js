import { $ } from './utils.js';

const MODES = ['system', 'dark', 'light'];
const LABEL = { system: 'Theme: follows your device', dark: 'Theme: dark', light: 'Theme: light' };

function read() {
  try {
    const t = localStorage.getItem('theme');
    return MODES.includes(t) ? t : 'system';
  } catch {
    return 'system';
  }
}

function apply(mode) {
  const root = document.documentElement;
  if (mode === 'system') root.removeAttribute('data-theme');
  else root.dataset.theme = mode;
  try { localStorage.setItem('theme', mode); } catch { /* private mode */ }

  const btn = $('#themeBtn');
  btn.dataset.mode = mode;
  btn.title = LABEL[mode];
  btn.setAttribute('aria-label', `${LABEL[mode]}. Click to change.`);
  window.dispatchEvent(new Event('themechange'));
}

export function initTheme() {
  apply(read());
  $('#themeBtn').addEventListener('click', () => {
    const next = MODES[(MODES.indexOf(read()) + 1) % MODES.length];
    apply(next);
  });
  // Device switched light/dark while in "system" mode
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (read() === 'system') window.dispatchEvent(new Event('themechange'));
  });
}
