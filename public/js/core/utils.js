export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

const compactFmt = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const fullFmt = new Intl.NumberFormat('en');
export const num = (n) => compactFmt.format(n || 0);
export const full = (n) => fullFmt.format(Math.round(n || 0));
export const pct = (x) => `${((x || 0) * 100).toFixed(1)}%`;

export function ago(iso) {
  const s = (Date.now() - Date.parse(iso)) / 1000;
  const units = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
  for (const [u, sec] of units) {
    if (s >= sec) {
      const k = Math.floor(s / sec);
      return `${k} ${u}${k > 1 ? 's' : ''} ago`;
    }
  }
  return 'just now';
}

export function clock(sec) {
  sec = Math.round(sec || 0);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = String(sec % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

export function durWords(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}

export const flag = (cc = '') => (cc.length === 2 ? String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 127397 + c.charCodeAt(0))) : '🌐');

let regionNames;
export function countryName(cc) {
  try {
    regionNames ||= new Intl.DisplayNames(['en'], { type: 'region' });
    return regionNames.of(cc) || cc;
  } catch {
    return cc;
  }
}

export const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Fill every [data-bind="path.to.value"] element with text from the given object. */
export function bindText(data) {
  for (const el of $$('[data-bind]')) {
    const val = el.dataset.bind.split('.').reduce((o, k) => o?.[k], data);
    if (val !== undefined && val !== null && val !== '') el.textContent = val;
  }
}

export function debounce(fn, ms = 200) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
