import { esc, num, ago, clock, pct } from '../core/utils.js';
import { icon } from '../core/icons.js';

export function badge(v) {
  if (v.live === 'live') return `<span class="badge live"><span class="live-dot"></span>LIVE</span>`;
  if (v.live === 'upcoming') return `<span class="badge up">UPCOMING</span>`;
  if (v.type === 'stream') return `<span class="badge stream">${icon('live')} STREAM</span>`;
  if (v.type === 'short') return `<span class="badge short">${icon('bolt')} SHORT</span>`;
  return '';
}

/** Thumbnail button — clicking anything with [data-play] opens the player modal. */
export function thumb(v, { lazy = true } = {}) {
  const dur = v.live === 'none' && v.duration ? `<span class="dur">${clock(v.duration)}</span>` : '';
  return `
    <button class="thumb" type="button" data-play="${esc(v.id)}" aria-label="Play: ${esc(v.title)}">
      <img src="${esc(v.thumb)}" alt="" ${lazy ? 'loading="lazy"' : ''} decoding="async" />
      ${badge(v)}${dur}
      <span class="play-ov">${icon('play')}</span>
    </button>`;
}

export function statChips(v, { showEngagement = true } = {}) {
  return `
    <div class="stat-chips">
      <span title="Views">${icon('eye')}${num(v.views)}</span>
      <span title="Likes">${icon('like')}${num(v.likes)}</span>
      <span title="Comments">${icon('comment')}${num(v.comments)}</span>
      ${showEngagement && v.engagement ? `<span class="eng" title="Engagement: (likes + comments) / views">${icon('fire')}${pct(v.engagement)}</span>` : ''}
    </div>`;
}

/** Map of game id → { name, emoji, color }, set once config loads. */
let GAMES = {};
export const setGameMeta = (games = []) => { GAMES = Object.fromEntries(games.map((g) => [g.id, g])); };

function gameTag(v) {
  const g = GAMES[v.game];
  return g ? `<span class="game-tag" style="--gc:${esc(g.color)}">${esc(g.emoji)} ${esc(g.name)}</span>` : '';
}

export function videoCard(v) {
  return `
    <article class="vcard tilt">
      ${thumb(v)}
      <div class="vmeta" data-play="${esc(v.id)}">
        ${gameTag(v)}
        <h3 class="vtitle" title="${esc(v.title)}">${esc(v.title)}</h3>
        <p class="vsub">${num(v.views)} views · ${ago(v.publishedAt)}</p>
        ${statChips(v)}
      </div>
    </article>`;
}
