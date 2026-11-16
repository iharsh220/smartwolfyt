import { $, $$, full, ago, debounce } from '../core/utils.js';
import { store } from '../core/store.js';
import { videoCard } from '../components/videoCard.js';

const PAGE = 24;
const TYPES = [
  { id: 'all', label: 'All' },
  { id: 'stream', label: '🔴 Live streams' },
  { id: 'video', label: '🎬 Videos' },
  { id: 'short', label: '⚡ Shorts' },
];

const SORTS = {
  latest: (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
  best: (a, b) => b.score - a.score,
  views: (a, b) => b.views - a.views,
  likes: (a, b) => b.likes - a.likes,
  comments: (a, b) => b.comments - a.comments,
  engagement: (a, b) => b.engagement - a.engagement,
  longest: (a, b) => b.duration - a.duration,
};

const st = { type: 'all', game: 'all', sort: 'latest', period: 'all', query: '', shown: PAGE };

/** Applies game + period + search (not type) so chip counts stay meaningful. */
function baseList() {
  let list = store.state.data?.videos || [];
  if (st.game !== 'all') list = list.filter((v) => v.game === st.game);
  if (st.period !== 'all') {
    const cutoff = Date.now() - Number(st.period) * 86_400_000;
    list = list.filter((v) => Date.parse(v.publishedAt) >= cutoff);
  }
  if (st.query) {
    const q = st.query.toLowerCase();
    list = list.filter((v) => `${v.title} ${v.tags.join(' ')}`.toLowerCase().includes(q));
  }
  return list;
}

function render() {
  const data = store.state.data;
  if (!data) return;
  const base = baseList();
  const counts = { all: base.length };
  for (const v of base) counts[v.type] = (counts[v.type] || 0) + 1;

  $('#typeChips').innerHTML = TYPES.map(
    (t) => `<button class="chip" role="tab" type="button" data-type="${t.id}" aria-selected="${st.type === t.id}">${t.label} <span class="count">${full(counts[t.id] || 0)}</span></button>`,
  ).join('');

  const items = (st.type === 'all' ? base : base.filter((v) => v.type === st.type)).slice().sort(SORTS[st.sort]);
  $('#resultCount').textContent = `${full(items.length)} result${items.length === 1 ? '' : 's'}${st.query ? ` for “${st.query}”` : ''}`;
  $('#grid').innerHTML = items.length
    ? items.slice(0, st.shown).map(videoCard).join('')
    : '<p class="empty">No matches. Try another filter 🎮</p>';
  $('#moreBtn').hidden = items.length <= st.shown;
  $('#moreBtn').textContent = `Load more (${full(items.length - st.shown)} left)`;
  $('#updated').textContent = `Updated ${ago(data.updatedAt)}`;
}

function update(patch) {
  Object.assign(st, patch, { shown: PAGE });
  render();
}

export function showLibraryError() {
  $('#grid').innerHTML = `<p class="empty">Couldn't load videos right now. Refresh in a minute 🔄</p>`;
}

/** Used by the game cards ("Show Blox Fruits videos"). */
export function setGameFilter(id) {
  $('#gameSel').value = id;
  update({ game: id, type: 'all' });
}

function fillGameSelect(config) {
  const games = config?.games || [];
  $('#gameSel').innerHTML =
    '<option value="all">🎮 Games</option>' +
    games.map((g) => `<option value="${g.id}">${g.emoji} ${g.name}</option>`).join('') +
    '<option value="other">📺 Other</option>';
}

export function initLibrary() {
  $('#gameSel').addEventListener('change', (e) => update({ game: e.target.value }));
  store.on('config', fillGameSelect);
  $('#typeChips').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-type]');
    if (chip) update({ type: chip.dataset.type });
  });
  $('#sortSel').addEventListener('change', (e) => update({ sort: e.target.value }));
  $('#periodSel').addEventListener('change', (e) => update({ period: e.target.value }));
  $('#moreBtn').addEventListener('click', () => {
    st.shown += PAGE;
    render();
  });

  const inputs = $$('[data-search]');
  const onSearch = debounce((value) => update({ query: value.trim() }), 180);
  for (const input of inputs) {
    input.addEventListener('input', () => {
      for (const other of inputs) if (other !== input) other.value = input.value;
      onSearch(input.value);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') $('#videos').scrollIntoView({ behavior: 'smooth' });
    });
  }

  store.on('data', render);
}
