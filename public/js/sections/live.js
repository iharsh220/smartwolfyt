import { $, esc, num, ago } from '../core/utils.js';
import { icon } from '../core/icons.js';
import { api } from '../core/api.js';
import { store } from '../core/store.js';
import { thumb, statChips } from '../components/videoCard.js';
import { baseTitle } from './hero.js';

const POLL_MS = 60_000;

/**
 * Preview mode — see how the site looks while live without actually streaming:
 *   /?preview=live   or   /?preview=upcoming
 * Uses the latest real stream as stand-in data.
 */
const PREVIEW = new URLSearchParams(location.search).get('preview');

function fakeLive() {
  const v = store.state.data?.videos.find((x) => x.type === 'stream');
  if (!v) return null;
  if (PREVIEW === 'upcoming') {
    const video = { ...v, live: 'upcoming', scheduledStart: new Date(Date.now() + 2 * 3600_000 + 754_000).toISOString() };
    return { status: 'upcoming', video, url: v.url };
  }
  return { status: 'live', video: { ...v, live: 'live', concurrentViewers: 1234 }, url: v.url };
}

/* ------------------------------------------------------------ polling */

async function poll() {
  if (PREVIEW) return;
  try {
    store.set('live', await api.live());
  } catch { /* keep last state */ }
  setTimeout(poll, document.hidden ? POLL_MS * 2 : POLL_MS);
}

/* ---------------------------------------------------------- countdown */

function parts(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

function tick() {
  for (const el of document.querySelectorAll('[data-countdown]')) {
    const ms = Date.parse(el.dataset.countdown) - Date.now();
    const p = parts(ms);
    if (el.dataset.style === 'text') {
      el.textContent = ms <= 0 ? 'starting any moment…' : `starts in ${p.d ? `${p.d}d ` : ''}${p.h}h ${p.m}m ${p.s}s`;
    } else {
      el.innerHTML = ms <= 0
        ? '<div><b>GO</b><small>any moment</small></div>'
        : [['d', 'days'], ['h', 'hours'], ['m', 'mins'], ['s', 'secs']]
            .filter(([k]) => k !== 'd' || p.d)
            .map(([k, label]) => `<div><b>${String(p[k]).padStart(2, '0')}</b><small>${label}</small></div>`)
            .join('');
    }
  }
}

/* ------------------------------------------------------- live alerts */

/** In-page anchors scroll; external links open a new tab. */
function setLink(a, href) {
  a.href = href;
  if (href.startsWith('#')) {
    a.removeAttribute('target');
    a.removeAttribute('rel');
  } else {
    a.target = '_blank';
    a.rel = 'noopener';
  }
}

function renderAlerts(l) {
  const isLive = l.status === 'live';
  const isUp = l.status === 'upcoming';
  const v = l.video;

  document.body.classList.toggle('is-live', isLive);
  document.body.classList.toggle('is-live-strip', isLive || isUp);

  // Top strip
  const strip = $('#liveStrip');
  strip.hidden = !(isLive || isUp);
  strip.classList.toggle('up', isUp);
  if (isLive || isUp) {
    // Live → scroll to the on-site player + chat. Upcoming → YouTube page (to set a reminder).
    setLink(strip, isLive ? '#live' : l.url);
    $('#liveStripLabel').textContent = isLive ? 'LIVE NOW' : 'UPCOMING';
    $('#liveStripTitle').textContent = v.title;
    const meta = $('#liveStripMeta');
    if (isLive) {
      meta.removeAttribute('data-countdown');
      meta.textContent = v.concurrentViewers ? `· ${num(v.concurrentViewers)} watching` : '';
    } else {
      meta.dataset.countdown = v.scheduledStart;
      meta.dataset.style = 'text';
    }
    $('#liveStripCta').textContent = isLive ? 'Watch + chat here ↓' : 'Set reminder →';
  }

  // Hero + nav indicators
  const pill = $('#heroLivePill');
  pill.hidden = !isLive;
  if (isLive) setLink(pill, '#live');
  $('#navLiveDot').hidden = !isLive;

  const watch = $('#heroWatch');
  if (isLive) {
    setLink(watch, '#live');
    watch.innerHTML = `<span class="live-dot" style="color:var(--live)"></span> Watch live now`;
  } else {
    setLink(watch, '#live');
    watch.textContent = isUp ? '⏰ Next stream' : '▶ Watch latest stream';
  }

  document.title = isLive ? `🔴 LIVE · ${baseTitle}` : baseTitle;

  renderToast(l);
  window.dispatchEvent(new CustomEvent('livechange', { detail: { live: isLive } }));
}

let arenaVisible = false;

/** Toast: shown while live, unless dismissed for this stream or the player is already on screen. */
function renderToast(l) {
  const toast = $('#toast');
  let dismissed = null;
  try { dismissed = sessionStorage.getItem('toast-dismissed'); } catch { /* ignore */ }
  if (l.status === 'live' && dismissed !== l.video.id && !arenaVisible) {
    setLink($('#toastLink'), '#live');
    $('#toastThumb').src = l.video.thumb;
    $('#toastTitle').textContent = l.video.title;
    toast.hidden = false;
  } else {
    toast.hidden = true;
  }
}

/* -------------------------------------------------------- live arena */

function scheduleMini(cfg) {
  const slots = cfg?.schedule?.slots || [];
  if (!slots.length) return '';
  return `<div class="schedule-mini">${slots
    .map((s) => `<span>${esc(s.days)} · <b>${esc(s.time)}</b></span>`)
    .join('')}${cfg.schedule.timezone ? `<span>${esc(cfg.schedule.timezone)}</span>` : ''}</div>`;
}

let arenaKey = '';

/** Live: embedded player + live chat side by side (stacked on phones). */
function liveStage(l) {
  const v = l.video;
  const id = encodeURIComponent(v.id);
  const host = encodeURIComponent(location.hostname || 'localhost');
  const dark = document.documentElement.dataset.theme === 'dark' ||
    (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
  return `
    <div class="live-stage">
      <div class="live-player">
        <iframe src="https://www.youtube.com/embed/${id}?autoplay=1&mute=1&playsinline=1&rel=0"
          title="Live stream" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>
      </div>
      <aside class="live-chat" aria-label="Live chat">
        <div class="live-chat-head">
          <span>${icon('comment')} Live chat</span>
          <button class="chat-toggle" type="button" aria-expanded="true">Hide</button>
        </div>
        <iframe src="https://www.youtube.com/live_chat?v=${id}&embed_domain=${host}${dark ? '&dark_theme=1' : ''}" title="Live chat"></iframe>
        <a class="chat-fallback" href="https://www.youtube.com/live_chat?is_popout=1&v=${id}" target="_blank" rel="noopener">Chat not loading? Open chat on YouTube ↗</a>
      </aside>
      <div class="live-info">
        <div class="live-info-text">
          <span class="arena-status"><span class="live-dot"></span>LIVE NOW
            ${v.concurrentViewers ? `<span class="live-viewers">${icon('eye')}<span data-viewers>${num(v.concurrentViewers)} watching</span></span>` : ''}</span>
          <h3>${esc(v.title)}</h3>
          <p class="vsub">Started ${ago(v.publishedAt)} · Say hi in chat 👋 (video starts muted, tap 🔊 to unmute)</p>
        </div>
        <div class="live-actions">
          <a class="btn btn-sub" href="${esc(l.url)}" target="_blank" rel="noopener">${icon('youtube')} Open on YouTube</a>
          <a class="btn btn-ghost" data-subscribe href="${esc(store.state.channel?.subscribeUrl || l.url)}" target="_blank" rel="noopener">${icon('bell')} Subscribe</a>
        </div>
      </div>
    </div>`;
}

function bindChatToggle(root) {
  const btn = root.querySelector('.chat-toggle');
  const chat = root.querySelector('.live-chat');
  btn?.addEventListener('click', () => {
    const hidden = chat.classList.toggle('collapsed');
    btn.textContent = hidden ? 'Show' : 'Hide';
    btn.setAttribute('aria-expanded', String(!hidden));
  });
}

function renderArena() {
  const { live: l, data, config: cfg, channel: ch } = store.state;
  const box = $('#liveArena');
  if (!l || (!data && l.status === 'offline')) return;

  // Re-render only when the state actually changes, so the live player/chat iframes
  // are not reloaded by the 60-second status poll.
  const key = `${l.status}:${l.video?.id || ''}:${data ? 1 : 0}`;
  if (key === arenaKey) {
    const viewers = box.querySelector('[data-viewers]');
    if (viewers && l.video?.concurrentViewers) viewers.textContent = `${num(l.video.concurrentViewers)} watching`;
    return;
  }
  arenaKey = key;

  if (l.status === 'live') {
    box.innerHTML = liveStage(l);
    bindChatToggle(box);
    return;
  }

  if (l.status === 'upcoming') {
    const v = l.video;
    box.innerHTML = `
      <div class="arena is-up">
        <a class="thumb" href="${esc(l.url)}" target="_blank" rel="noopener"><img src="${esc(v.thumb)}" alt="" /><span class="badge up">UPCOMING</span></a>
        <div class="arena-body">
          <span class="arena-status">${icon('clock')} NEXT STREAM</span>
          <h3>${esc(v.title)}</h3>
          <div class="countdown" data-countdown="${esc(v.scheduledStart)}"></div>
          <a class="btn btn-accent btn-lg" href="${esc(l.url)}" target="_blank" rel="noopener">${icon('bell')} Set a reminder</a>
        </div>
      </div>`;
    tick();
    return;
  }

  // Offline → show the latest finished stream as a replay
  const last = data.videos
    .filter((v) => v.type === 'stream' && v.live === 'none')
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))[0];
  if (!last) { box.innerHTML = ''; return; }

  box.innerHTML = `
    <div class="arena">
      ${thumb(last, { lazy: false })}
      <div class="arena-body">
        <span class="arena-status">${icon('clock')} OFFLINE · BACK SOON</span>
        <h3>Last stream: ${esc(last.title)}</h3>
        <p class="vsub">${num(last.views)} views · ${ago(last.publishedAt)}</p>
        ${statChips(last)}
        ${scheduleMini(cfg)}
        <div class="hero-cta">
          <button class="btn btn-accent" type="button" data-play="${esc(last.id)}">${icon('play')} Watch replay</button>
          <a class="btn btn-sub" href="${esc(ch?.subscribeUrl || l.url)}" target="_blank" rel="noopener">${icon('bell')} Subscribe & get notified</a>
        </div>
      </div>
    </div>`;
}

/* ------------------------------------------------------------- init */

export function initLive() {
  store.on('live', (l) => {
    renderAlerts(l);
    renderArena();
  });
  store.on('data', renderArena);
  store.on('channel', renderArena);

  $('#toastLink').addEventListener('click', () => { $('#toast').hidden = true; });

  // The toast only makes sense while the player is off-screen.
  arenaVisible = false;
  new IntersectionObserver(([e]) => {
    arenaVisible = e.isIntersecting;
    if (arenaVisible) $('#toast').hidden = true;
    else if (store.state.live) renderToast(store.state.live);
  }, { threshold: 0.25 }).observe($('#liveArena'));
  $('#toastClose').addEventListener('click', () => {
    $('#toast').hidden = true;
    try { sessionStorage.setItem('toast-dismissed', store.state.live?.video?.id || ''); } catch { /* ignore */ }
  });

  setInterval(tick, 1000);
  if (PREVIEW) {
    store.on('data', () => {
      const l = fakeLive();
      if (l) store.set('live', l);
    });
  }
  poll();
}
