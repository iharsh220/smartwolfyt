/**
 * Per-game stats. `v.game` is set on the server (src/services/insights.js) from
 * the keywords in config/site.config.json → games[].match.
 */
export function gameStats(videos, gameId) {
  const list = videos.filter((v) => v.game === gameId && v.live === 'none');
  const best = list.reduce((a, b) => (!a || b.score > a.score ? b : a), null);
  return {
    count: list.length,
    views: list.reduce((s, v) => s + v.views, 0),
    hours: list.filter((v) => v.type === 'stream').reduce((s, v) => s + v.duration, 0) / 3600,
    best,
  };
}
