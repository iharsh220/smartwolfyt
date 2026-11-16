import { $, esc } from '../core/utils.js';
import { icon } from '../core/icons.js';
import { api } from '../core/api.js';
import { commentHTML } from '../components/comment.js';
import { reveal } from '../effects/reveal.js';

export async function loadTopComments() {
  const wall = $('#commentWall');
  wall.innerHTML = Array.from({ length: 6 }, () => '<div class="skeleton comment-card" style="height:140px"></div>').join('');
  try {
    const list = await api.topComments();
    if (!list.length) {
      $('#comments').hidden = true;
      return;
    }
    wall.innerHTML = list
      .map(
        (c, i) => `
        <article class="comment-card reveal">
          ${i === 0 ? `<div class="crown"><span class="rarity legendary">${icon('trophy')} TOP COMMENT</span></div>` : ''}
          ${i === 1 || i === 2 ? `<div class="crown"><span class="rarity epic">#${i + 1}</span></div>` : ''}
          ${commentHTML(c)}
          <a class="on" href="#" data-play="${esc(c.videoId)}">▶ on: ${esc(c.videoTitle)}</a>
        </article>`,
      )
      .join('');
    reveal(wall);
  } catch {
    $('#comments').hidden = true;
  }
}
