import { $, $$ } from './core/utils.js';
import { loaderStep, hideLoader, imageReady } from './core/loader.js';
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

  // Start the big videos request right away, in parallel with channel/config.
  loaderStep('Joining the server…', 15);
  const videosReq = api.videos();
  videosReq.catch(() => {}); // handled below; avoid an unhandled-rejection warning

  let config, channel;
  try {
    [config, channel] = await Promise.all([api.config(), api.channel()]);
  } catch (err) {
    console.error(err);
    showLibraryError();
    hideLoader();
    return;
  }
  setGameMeta(config.games);
  store.set('config', config);
  store.set('channel', channel);
  renderHero();
  renderAbout(channel, config);
  loaderStep('Opening the inventory…', 45);

  try {
    const data = await videosReq;
    loaderStep('Hatching the eggs…', 85);
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

  // Reveal the page once the channel icon is painted too (max 2.5 s extra wait).
  await imageReady($('#heroAvatar'));
  hideLoader();

  loadTopComments();
  loadAnalytics();
}

boot();
