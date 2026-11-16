'use strict';
const { compact, full, pct, mean, durWords } = require('../lib/format');

const TYPES = ['stream', 'video', 'short'];
const LABEL = { stream: 'streams', video: 'videos', short: 'Shorts' };

/**
 * Combined score: views on a log scale, with engagement (likes + comments per view)
 * as a capped bonus of up to +60%. Reach matters most; a tiny upload with a few
 * enthusiastic likes can't beat a stream watched by tens of thousands.
 */
function score(v) {
  return Math.log10(v.views + 10) * (1 + Math.min(v.engagement, 0.15) * 4);
}

const rankOf = (group, v, key) => 1 + group.filter((x) => x[key] > v[key]).length;
const pickMax = (arr, key) => (arr.length ? arr.reduce((a, b) => (b[key] > a[key] ? b : a)) : null);

/**
 * Tags each video with `game` (config order = priority). The title wins; tags are
 * only a fallback because creators often reuse the same tag list on every upload.
 */
function tagGames(videos, games = []) {
  const rules = games.map((g) => ({ id: g.id, words: (g.match || []).map((w) => w.toLowerCase()) }));
  const find = (text) => rules.find((r) => r.words.some((w) => text.includes(w)))?.id;
  for (const v of videos) {
    v.game = find(v.title.toLowerCase()) || find((v.tags || []).join(' ').toLowerCase()) || 'other';
  }
}

function averagesOf(group) {
  return {
    count: group.length,
    views: mean(group.map((v) => v.views)),
    likes: mean(group.map((v) => v.likes)),
    comments: mean(group.map((v) => v.comments)),
    engagement: mean(group.filter((v) => v.views > 0).map((v) => v.engagement)),
    duration: mean(group.map((v) => v.duration)),
  };
}

function explain(v, group, avg, type, scope) {
  if (!v) return null;
  const what = `${scope ? `${scope} ` : ''}${LABEL[type]}`;
  const one = `${scope ? `${scope} ` : ''}${type}`;
  const reasons = [];
  reasons.push(`Ranked #1 of ${group.length} ${what} on combined views + engagement score`);

  if (avg.views > 0) {
    const r = v.views / avg.views;
    reasons.push(
      r >= 1.15
        ? `${r.toFixed(1)}× the views of an average ${one} (${compact(v.views)} vs ${compact(Math.round(avg.views))})`
        : `${full(v.views)} views — one of the most watched ${what}`,
    );
  }

  // Only mention engagement when it is actually a strength.
  if (v.engagement > 0 && avg.engagement > 0) {
    const r = v.engagement / avg.engagement;
    if (r >= 1.1) reasons.push(`${pct(v.engagement)} engagement — ${r.toFixed(1)}× the ${one} average`);
    else if (r >= 0.9) reasons.push(`${pct(v.engagement)} of viewers liked or commented`);
  }

  const cRank = rankOf(group, v, 'comments');
  if (v.comments > 0 && cRank <= 3) reasons.push(`#${cRank} most discussed ${one} — ${full(v.comments)} comments`);

  const lRank = rankOf(group, v, 'likes');
  if (v.likes > 0 && lRank <= 3) reasons.push(`#${lRank} most liked ${one} — ${full(v.likes)} likes`);

  if (type === 'stream' && v.duration > 0) {
    const hours = Math.max(v.duration / 3600, 0.25);
    reasons.push(`${durWords(v.duration)} session pulling ${compact(Math.round(v.views / hours))} views per hour`);
  }

  const days = (Date.now() - Date.parse(v.publishedAt)) / 86_400_000;
  if (days <= 14) reasons.push(`Fresh hit — only ${Math.max(1, Math.round(days))} day(s) old and already on top`);

  return { id: v.id, reasons: reasons.slice(0, 5) };
}

/** Best stream / video / short inside one pool of videos. */
function bestOf(pool, scope) {
  const out = {};
  for (const t of TYPES) {
    const group = pool.filter((v) => v.type === t);
    out[t] = explain(pickMax(group, 'score'), group, averagesOf(group), t, scope);
  }
  return out;
}

function analyse(all, games = []) {
  tagGames(all, games);
  for (const v of all) {
    v.engagement = v.views ? (v.likes + v.comments) / v.views : 0;
    v.score = v.live === 'none' ? score(v) : 0;
  }

  const done = all.filter((v) => v.live === 'none');
  // Hall of fame focuses on the configured games; fall back to everything if none match.
  const featured = done.filter((v) => v.game !== 'other');
  const pool = featured.length ? featured : done;

  const best = { all: bestOf(pool, '') };
  for (const g of games) {
    const list = done.filter((v) => v.game === g.id);
    if (list.length) best[g.id] = bestOf(list, g.name);
  }

  const groups = Object.fromEntries(TYPES.map((t) => [t, done.filter((v) => v.type === t)]));
  const averages = Object.fromEntries(TYPES.map((t) => [t, averagesOf(groups[t])]));

  const poolAvgViews = mean(pool.map((v) => v.views));
  const engagementPool = pool.filter((v) => v.views >= Math.max(50, poolAvgViews * 0.25));
  const id = (v) => v?.id || null;
  const records = {
    mostViewed: id(pickMax(pool, 'views')),
    mostLiked: id(pickMax(pool, 'likes')),
    mostCommented: id(pickMax(pool, 'comments')),
    longestStream: id(pickMax(pool.filter((v) => v.type === 'stream'), 'duration')),
    topEngagement: id(pickMax(engagementPool, 'engagement')),
  };

  const totals = {
    count: { all: all.length, stream: groups.stream.length, video: groups.video.length, short: groups.short.length },
    views: done.reduce((s, v) => s + v.views, 0),
    likes: done.reduce((s, v) => s + v.likes, 0),
    comments: done.reduce((s, v) => s + v.comments, 0),
    streamHours: groups.stream.reduce((s, v) => s + v.duration, 0) / 3600,
    avgEngagement: mean(done.filter((v) => v.views > 0).map((v) => v.engagement)),
  };

  return { updatedAt: new Date().toISOString(), videos: all, best, records, averages, totals };
}

module.exports = { analyse };
