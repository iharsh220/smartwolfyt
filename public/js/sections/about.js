import { $, esc, num, full } from '../core/utils.js';
import { icon } from '../core/icons.js';

const SOCIALS = {
  youtube: { label: 'YouTube', icon: 'youtube' },
  instagram: { label: 'Instagram', icon: 'instagram' },
  discord: { label: 'Discord', icon: 'discord' },
  kick: { label: 'Kick', icon: 'kick' },
  x: { label: 'X', icon: 'x' },
  tiktok: { label: 'TikTok', icon: 'tiktok' },
  email: { label: 'Email', icon: 'mail' },
};

function renderDescription(ch) {
  const el = $('#aboutText');
  const btn = $('#aboutMore');
  // YouTube descriptions often contain **markdown bold** that YouTube itself doesn't render.
  el.textContent = ch.description.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\n{3,}/g, '\n\n');
  requestAnimationFrame(() => {
    if (el.scrollHeight > el.clientHeight + 10) {
      el.classList.add('clamped');
      btn.hidden = false;
      btn.onclick = () => {
        const open = el.classList.toggle('open');
        btn.textContent = open ? 'Show less' : 'Show more';
      };
    }
  });
}

function renderSchedule(cfg) {
  const s = cfg.schedule || {};
  $('#scheduleCard').innerHTML = `
    <h3>${icon('calendar')} Stream schedule</h3>
    <p class="pill pill-live" style="margin-bottom:10px"><span class="live-dot"></span>${esc(s.label || 'Live streams')}</p>
    ${(s.slots || []).map((x) => `<div class="slot"><span>${esc(x.days)}</span><b>${esc(x.time)}</b></div>`).join('')}
    ${s.timezone ? `<p class="note">All times in ${esc(s.timezone)}.</p>` : ''}
    ${s.note ? `<p class="note">${esc(s.note)}</p>` : ''}`;
}

function renderSocials(ch, cfg) {
  const entries = Object.entries({ youtube: ch.url, ...(cfg.socials || {}) }).filter(([k, url]) => url && SOCIALS[k]);
  const seen = new Set();
  const links = entries
    .filter(([k]) => !seen.has(k) && seen.add(k))
    .map(([k, url]) => {
      const href = k === 'email' ? `mailto:${url}` : url;
      const s = SOCIALS[k];
      return `<a class="social ${k}" href="${esc(href)}" ${k === 'email' ? '' : 'target="_blank" rel="noopener"'}>${icon(s.icon)}${s.label}</a>`;
    });
  $('#socialCard').innerHTML = `<h3>${icon('users')} Join the ${esc(cfg.community || '')} pack</h3><div class="socials">${links.join('')}</div>`;
}

function renderSponsor(ch, cfg, data) {
  if (!cfg.sponsorEmail) return;
  const card = $('#sponsorCard');
  const hours = data ? ` · ${full(data.totals.streamHours)} hours streamed` : '';
  card.hidden = false;
  card.innerHTML = `
    <h3>${icon('bolt')} Brands & collabs</h3>
    <p>${num(ch.subscribers)} subscribers · ${num(ch.views)} views${hours}. Live every day with an engaged Roblox audience, so let's build something together.</p>
    <a class="btn btn-accent" href="mailto:${esc(cfg.sponsorEmail)}?subject=${encodeURIComponent(`Collab with ${ch.title}`)}">${icon('mail')} ${esc(cfg.sponsorEmail)}</a>`;
}

export function renderAbout(ch, cfg, data = null) {
  renderDescription(ch);
  renderSchedule(cfg);
  renderSocials(ch, cfg);
  renderSponsor(ch, cfg, data);
}
