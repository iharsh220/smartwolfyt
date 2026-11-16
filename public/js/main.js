import { $$ } from './core/utils.js';
import { api } from './core/api.js';
import { store } from './core/store.js';
import { initTheme } from './core/theme.js';
import { initModal } from './components/modal.js';
import { initTilt } from './effects/tilt.js';
import { reveal } from './effects/reveal.js';
import { renderHero, renderHeroTotals } from './sections/hero.js';
import { initLive } from './sections/live.js';
import { renderBest } from './sections/best.js';
import { initLibrary, showLibraryError } from './sections/library.js';
import { renderPower, loadAnalytics } from './sections/stats.js';
import { loadTopComments } from './sections/comments.js';
import { renderAbout } from './sections/about.js';
import { renderGames } from './sections/games.js';
import { setGameMeta } from './components/videoCard.js';

/** Highlights the nav link of the section currently on screen. */
function initNavSpy() {
  const links = $$('.nav a, .bottom-nav a');
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        for (const a of links) a.classList.toggle('active', a.getAttribute('href') === `#${e.target.id}`);
      }
    },
    { rootMargin: '-45% 0px -50% 0px' },
  );
  for (const s of $$('main > section[id]')) io.observe(s);
}

/**
 * Removes badges/toolbars that a host injects into the page (e.g. Netlify's "Powered by" badge).
 * CSS in base.css hides them instantly; this also removes ones added later.
 */
function removeHostBadges() {
  const SELECTOR = '#nl-badge, .nl-badge, nl-badge, [id^="nl-badge"], [class^="nl-badge"], netlify-toolbar, #netlify-toolbar, #netlify-drawer';
  const sweep = () => document.querySelectorAll(SELECTOR).forEach((el) => el.remove());
  sweep();
  new MutationObserver(sweep).observe(document.documentElement, { childList: true, subtree: true });
}

async function boot() {
  removeHostBadges();
  initTheme();
  initModal();
  initTilt();
  initLibrary();
  initLive();
  initNavSpy();
  reveal();

  let config, channel;
  try {
    [config, channel] = await Promise.all([api.config(), api.channel()]);
  } catch (err) {
    console.error(err);
    showLibraryError();
    return;
  }
  setGameMeta(config.games);
  store.set('config', config);
  store.set('channel', channel);
  renderHero();
  renderAbout(channel, config);

  try {
    const data = await api.videos();
    store.set('data', data);
    renderHeroTotals(data);
    renderGames();
    renderBest(data);
    renderPower(data, channel);
    renderAbout(channel, config, data);
  } catch (err) {
    console.error(err);
    showLibraryError();
  }

  loadTopComments();
  loadAnalytics();
}

boot();
