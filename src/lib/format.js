'use strict';

const compactFmt = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const fullFmt = new Intl.NumberFormat('en');

const compact = (n) => compactFmt.format(n || 0);
const full = (n) => fullFmt.format(n || 0);
const pct = (x) => `${((x || 0) * 100).toFixed(1)}%`;
const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

function durWords(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}

/** ISO-8601 duration (PT1H2M3S / P1DT2H) → seconds */
function parseDuration(iso = '') {
  const m = iso.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/) || [];
  return (+m[1] || 0) * 86400 + (+m[2] || 0) * 3600 + (+m[3] || 0) * 60 + (+m[4] || 0);
}

const isoDate = (ms) => new Date(ms).toISOString().slice(0, 10);

module.exports = { compact, full, pct, mean, durWords, parseDuration, isoDate };
