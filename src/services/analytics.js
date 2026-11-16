'use strict';
const config = require('../config/env');
const { cached } = require('../lib/cache');
const { isoDate } = require('../lib/format');

let token = null;

async function accessToken() {
  if (token && token.exp > Date.now()) return token.value;
  const { clientId, clientSecret, refreshToken } = config.oauth;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`OAuth: ${d.error_description || d.error || res.status}`);
  token = { value: d.access_token, exp: Date.now() + ((d.expires_in || 3600) - 120) * 1000 };
  return token.value;
}

/** Runs one Analytics report and returns rows as objects keyed by column name. */
async function report(params) {
  const url = new URL('https://youtubeanalytics.googleapis.com/v2/reports');
  for (const [k, v] of Object.entries({ ids: 'channel==MINE', ...params })) url.searchParams.set(k, v);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${await accessToken()}` },
    signal: AbortSignal.timeout(15_000),
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Analytics: ${d?.error?.message || res.status}`);
  const cols = (d.columnHeaders || []).map((c) => c.name);
  return (d.rows || []).map((r) => Object.fromEntries(r.map((val, i) => [cols[i], val])));
}

const DAY = 86_400_000;

const getAnalytics = () =>
  cached('analytics', 3 * 3600_000, async () => {
    if (!config.oauth.enabled) return { available: false, reason: 'OAuth not configured' };

    const now = Date.now();
    const range = { startDate: isoDate(now - 29 * DAY), endDate: isoDate(now) };
    const prevRange = { startDate: isoDate(now - 59 * DAY), endDate: isoDate(now - 30 * DAY) };

    const [daily, prev, countries, devices] = await Promise.all([
      report({
        ...range,
        metrics: 'views,estimatedMinutesWatched,averageViewDuration,subscribersGained,subscribersLost,likes',
        dimensions: 'day',
        sort: 'day',
      }),
      report({ ...prevRange, metrics: 'views,estimatedMinutesWatched,subscribersGained,subscribersLost' }),
      report({ ...range, metrics: 'views', dimensions: 'country', sort: '-views', maxResults: 6 }),
      report({ ...range, metrics: 'views', dimensions: 'deviceType', sort: '-views' }),
    ]);

    const sum = (k) => daily.reduce((s, d) => s + (d[k] || 0), 0);
    const views = sum('views');
    const totals = {
      views,
      watchHours: sum('estimatedMinutesWatched') / 60,
      subscribersGained: sum('subscribersGained'),
      subscribersLost: sum('subscribersLost'),
      likes: sum('likes'),
      avgViewDuration: views ? daily.reduce((s, d) => s + d.averageViewDuration * d.views, 0) / views : 0,
    };
    const p = prev[0] || {};
    const previous = {
      views: p.views || 0,
      watchHours: (p.estimatedMinutesWatched || 0) / 60,
      netSubs: (p.subscribersGained || 0) - (p.subscribersLost || 0),
    };

    return { available: true, range, daily, totals, previous, countries, devices };
  });

module.exports = { getAnalytics };
