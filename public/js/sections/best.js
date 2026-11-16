import { $, esc, num, ago, pct, durWords } from '../core/utils.js';
import { icon } from '../core/icons.js';
import { store } from '../core/store.js';
import { thumb, statChips } from '../components/videoCard.js';
import { reveal } from '../effects/reveal.js';

// Rarity tiers, like egg / fruit rarities in-game.
const SLOTS = [
  { type: 'stream', label: 'Best Stream', rarity: 'mythic' },
  { type: 'video', label: 'Best Video', rarity: 'legendary' },
  { type: 'short', label: 'Best Short', rarity: 'epic' },
];

const RECORDS = [
  { key: 'mostViewed', label: 'Most viewed', icon: 'eye', value: (v) => `${num(v.views)} views` },
  { key: 'mostLiked', label: 'Most liked', icon: 'like', value: (v) => `${num(v.likes)} likes` },
  { key: 'mostCommented', label: 'Most discussed', icon: 'comment', value: (v) => `${num(v.comments)} comments` },
  { key: 'longestStream', label: 'Longest stream', icon: 'clock', value: (v) => durWords(v.duration) },
  { key: 'topEngagement', label: 'Top engagement', icon: 'fire', value: (v) => pct(v.engagement) },
];

let scope = 'all';

function trophy({ type, label, rarity }, pick) {
  const v = store.video(pick.id);
  if (!v) return '';
  const extra = type === 'stream' && v.duration ? ` · ${durWords(v.duration)} live` : '';
  return `
    <article class="trophy reveal" data-kind="${type}">
      <div class="trophy-inner tilt">
        <div class="trophy-label"><span class="rarity ${rarity}">${rarity.toUpperCase()}</span><span>${label}</span>${icon('trophy')}</div>
        ${thumb(v)}
        <h3 class="vtitle" data-play="${esc(v.id)}" style="cursor:pointer">${esc(v.title)}</h3>
        <p class="vsub">${ago(v.publishedAt)}${extra}</p>
        ${statChips(v)}
        <p class="why">${icon('trophy')} Why it dropped ${rarity}</p>
        <ul class="reasons">${pick.reasons.map((r) => `<li>${icon('check')}<span>${esc(r)}</span></li>`).join('')}</ul>
      </div>
    </article>`;
}

function renderTabs(data) {
  const games = (store.state.config?.games || []).filter((g) => data.best[g.id]);
  const tabs = [{ id: 'all', label: '🎮 All Roblox' }, ...games.map((g) => ({ id: g.id, label: `${g.emoji} ${g.name}` }))];
  $('#bestTabs').innerHTML = tabs
    .map((t) => `<button class="chip" type="button" role="tab" data-scope="${esc(t.id)}" aria-selected="${t.id === scope}">${esc(t.label)}</button>`)
    .join('');
}

function renderTrophies(data) {
  const best = data.best[scope] || data.best.all;
  const html = SLOTS.filter((s) => best[s.type]).map((s) => trophy(s, best[s.type])).join('');
  $('#trophies').innerHTML = html || '<p class="empty">Not enough data yet.</p>';
  reveal($('#trophies'));
}

export function renderBest(data) {
  renderTabs(data);
  renderTrophies(data);

  $('#bestTabs').onclick = (e) => {
    const tab = e.target.closest('[data-scope]');
    if (!tab || tab.dataset.scope === scope) return;
    scope = tab.dataset.scope;
    renderTabs(data);
    renderTrophies(data);
  };

  $('#records').innerHTML = RECORDS.map((r) => {
    const v = store.video(data.records[r.key]);
    if (!v) return '';
    return `
      <button class="record reveal" type="button" data-play="${esc(v.id)}" title="${esc(v.title)}">
        <span class="record-head">
          <span class="record-ic">${icon(r.icon)}</span>
          <span class="record-stat"><small>${r.label}</small><b>${r.value(v)}</b></span>
        </span>
        <span class="record-video">
          <img src="${esc(v.thumb)}" alt="" loading="lazy" />
          <span class="record-title">${esc(v.title)}</span>
        </span>
      </button>`;
  }).join('');

  reveal($('#best'));
}
