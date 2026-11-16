import { $, esc, num, full } from '../core/utils.js';
import { store } from '../core/store.js';
import { gameStats } from '../core/games.js';
import { reveal } from '../effects/reveal.js';
import { setGameFilter } from './library.js';

export function renderGames() {
  const { config, data } = store.state;
  const games = config?.games || [];
  const box = $('#gameCards');
  if (!games.length || !data) {
    $('#games').hidden = true;
    return;
  }

  box.innerHTML = games
    .map((g) => {
      const s = gameStats(data.videos, g.id);
      if (!s.count) return '';
      const best = s.best
        ? `<button class="game-best" type="button" data-play="${esc(s.best.id)}">
             <img src="${esc(s.best.thumb)}" alt="" loading="lazy" />
             <span><small>⭐ Best ${esc(g.name)} upload</small><span>${esc(s.best.title)}</span></span>
           </button>`
        : '';
      return `
        <article class="game-card reveal tilt" style="--gc:${esc(g.color || '#ffcc00')}">
          <div class="game-top">
            <span class="game-emoji" aria-hidden="true">${esc(g.emoji || '🎮')}</span>
            <div><h3>${esc(g.name)}</h3><p>${esc(g.blurb || '')}</p></div>
          </div>
          <div class="game-stats">
            <div><b>${full(s.count)}</b><small>Uploads</small></div>
            <div><b>${num(s.views)}</b><small>Views</small></div>
            <div><b>${full(s.hours)}</b><small>Hours live</small></div>
          </div>
          ${best}
          <button class="btn btn-accent" type="button" data-game="${esc(g.id)}">▶ Show ${esc(g.name)} videos</button>
        </article>`;
    })
    .join('');

  box.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-game]');
    if (!btn) return;
    setGameFilter(btn.dataset.game);
    $('#videos').scrollIntoView({ behavior: 'smooth' });
  });
  reveal(box);
}

/** Small pills in the hero: 🥚 Steal an Egg · 🍇 Blox Fruits … */
export function renderGamePills() {
  const games = store.state.config?.games || [];
  $('#gamePills').innerHTML = games
    .slice(0, 2)
    .map((g) => `<a class="pill" href="#games" style="background:${esc(g.color)};color:#111">${esc(g.emoji)} ${esc(g.name)}</a>`)
    .join('');
}
