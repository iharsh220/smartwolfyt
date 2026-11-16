import { $, $$, bindText, num, full } from '../core/utils.js';
import { store } from '../core/store.js';
import { countUp } from '../effects/reveal.js';
import { renderGamePills } from './games.js';

export let baseTitle = document.title;

/** YouTube avatar/banner hosts reject requests that carry a Referer (HTTP 429), so never send one. */
function setImage(img, src) {
  img.referrerPolicy = 'no-referrer';
  img.src = src;
}

function setFavicon(src) {
  const link = document.querySelector('link[rel="icon"]');
  link.referrerPolicy = 'no-referrer';
  link.type = 'image/jpeg';
  link.href = src;
}

export function renderHero() {
  const { channel: ch, config: cfg } = store.state;
  bindText({ channel: ch, config: cfg });

  setImage($('#brandAvatar'), ch.avatar);
  setImage($('#heroAvatar'), ch.avatar);
  setFavicon(ch.avatar);
  if (ch.banner) {
    const banner = $('#heroBanner');
    banner.onload = () => { banner.hidden = false; };
    setImage(banner, ch.banner);
  }
  for (const a of $$('[data-subscribe]')) a.href = ch.subscribeUrl;
  renderGamePills();

  const games = (cfg.games || []).slice(0, 2).map((g) => g.name).join(' & ');
  baseTitle = `${ch.title} · ${games || cfg.game} · Roblox Live Streams`;
  document.title = baseTitle;
  $('#year').textContent = new Date().getFullYear();

  const stats = { subscribers: ch.subscribers, views: ch.views, videoCount: ch.videoCount };
  for (const [k, v] of Object.entries(stats)) countUp($(`[data-stat="${k}"]`), v, num);
}

export function renderHeroTotals(data) {
  countUp($('[data-stat="streamHours"]'), data.totals.streamHours, (v) => full(v));
}
