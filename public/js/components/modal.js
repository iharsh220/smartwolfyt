import { $, esc } from '../core/utils.js';
import { icon } from '../core/icons.js';
import { api } from '../core/api.js';
import { store } from '../core/store.js';
import { statChips } from './videoCard.js';
import { commentHTML } from './comment.js';

const modal = () => $('#modal');
let lastFocus = null;

function reasonsFor(id) {
  // best = { all: {stream, video, short}, '<game-id>': {...}, ... }
  const best = store.state.data?.best || {};
  for (const picks of Object.values(best)) {
    for (const [type, pick] of Object.entries(picks || {})) {
      if (pick?.id === id) return { type, reasons: pick.reasons };
    }
  }
  return null;
}

export function openVideo(id) {
  const v = store.video(id);
  if (!v) return;
  lastFocus = document.activeElement;

  const host = v.live === 'live' ? 'www.youtube.com' : 'www.youtube-nocookie.com';
  $('#mFrame').src = `https://${host}/embed/${encodeURIComponent(v.id)}?autoplay=1&rel=0&modestbranding=1`;
  $('#mTitle').textContent = v.title;
  $('#mStats').innerHTML = statChips(v);
  $('#mLink').href = v.url;

  const why = reasonsFor(v.id);
  $('#mWhy').innerHTML = why
    ? `<p class="why">${icon('trophy')} Why it's the best ${esc(why.type)}</p>
       <ul class="reasons">${why.reasons.map((r) => `<li>${icon('check')}<span>${esc(r)}</span></li>`).join('')}</ul>`
    : '';

  const box = $('#mComments');
  box.innerHTML = '<div class="skeleton" style="height:64px"></div><div class="skeleton" style="height:64px"></div>';
  api.comments(v.id)
    .then((list) => {
      box.innerHTML = list.length ? list.slice(0, 10).map(commentHTML).join('') : '<p class="note">No comments yet.</p>';
    })
    .catch(() => { box.innerHTML = '<p class="note">Comments unavailable right now.</p>'; });

  modal().hidden = false;
  document.body.style.overflow = 'hidden';
  $('.modal-close').focus();
}

export function closeVideo() {
  if (modal().hidden) return;
  modal().hidden = true;
  $('#mFrame').src = 'about:blank';
  document.body.style.overflow = '';
  lastFocus?.focus?.();
}

export function initModal() {
  document.addEventListener('click', (e) => {
    const play = e.target.closest('[data-play]');
    if (play) {
      e.preventDefault();
      openVideo(play.dataset.play);
      return;
    }
    if (e.target.closest('[data-close]')) closeVideo();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeVideo();
  });
}
