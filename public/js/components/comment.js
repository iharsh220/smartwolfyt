import { esc, num, ago } from '../core/utils.js';
import { icon } from '../core/icons.js';

export function commentHTML(c) {
  return `
    <div class="comment">
      <img src="${esc(c.avatar)}" alt="" loading="lazy" referrerpolicy="no-referrer" />
      <div>
        <div class="comment-author">${esc(c.author)}<span class="comment-time">${ago(c.publishedAt)}</span></div>
        <p class="comment-text">${esc(c.text)}</p>
        <div class="comment-meta">
          <span>${icon('like')}${num(c.likes)}</span>
          ${c.replies ? `<span>${icon('comment')}${num(c.replies)} replies</span>` : ''}
        </div>
      </div>
    </div>`;
}
