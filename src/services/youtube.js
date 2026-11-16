'use strict';
const fs = require('fs');
const path = require('path');
const config = require('../config/env');
const { cached } = require('../lib/cache');
const { parseDuration } = require('../lib/format');
const { analyse } = require('./insights');

const BASE = 'https://www.googleapis.com/youtube/v3';

async function yt(endpoint, params) {
  const url = new URL(`${BASE}/${endpoint}`);
  for (const [k, v] of Object.entries({ ...params, key: config.apiKey })) {
    if (v !== undefined && v !== null) url.searchParams.set(k, v);
  }
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error?.message || `YouTube API ${res.status}`);
    err.status = res.status;
    err.reason = data?.error?.errors?.[0]?.reason;
    throw err;
  }
  return data;
}

const bestThumb = (t = {}) => (t.maxres || t.standard || t.high || t.medium || t.default || {}).url || '';
const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

/* ---------------------------------------------------------------- channel */

const getChannel = () =>
  cached('channel', 30 * 60_000, async () => {
    const d = await yt('channels', { part: 'snippet,statistics,brandingSettings,contentDetails', id: config.channelId });
    const c = d.items?.[0];
    if (!c) throw new Error('Channel not found — check YOUTUBE_CHANNEL_ID');
    const banner = c.brandingSettings?.image?.bannerExternalUrl;
    return {
      id: c.id,
      title: c.snippet.title,
      description: c.snippet.description || '',
      handle: c.snippet.customUrl || '',
      country: c.snippet.country || '',
      publishedAt: c.snippet.publishedAt,
      avatar: bestThumb(c.snippet.thumbnails),
      banner: banner ? `${banner}=w2120-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj` : null,
      subscribers: Number(c.statistics.subscriberCount) || 0,
      hiddenSubscribers: Boolean(c.statistics.hiddenSubscriberCount),
      views: Number(c.statistics.viewCount) || 0,
      videoCount: Number(c.statistics.videoCount) || 0,
      uploads: c.contentDetails.relatedPlaylists.uploads,
      url: `https://www.youtube.com/channel/${c.id}`,
      liveUrl: `https://www.youtube.com/channel/${c.id}/live`,
      subscribeUrl: `https://www.youtube.com/channel/${c.id}?sub_confirmation=1`,
    };
  });

/* ----------------------------------------------------------------- videos */

function normalizeVideo(v) {
  const ls = v.liveStreamingDetails;
  let duration = parseDuration(v.contentDetails?.duration);
  if (!duration && ls?.actualStartTime && ls?.actualEndTime) {
    duration = (Date.parse(ls.actualEndTime) - Date.parse(ls.actualStartTime)) / 1000;
  }
  return {
    id: v.id,
    title: v.snippet.title,
    description: (v.snippet.description || '').slice(0, 600),
    publishedAt: ls?.actualStartTime || v.snippet.publishedAt,
    thumb: bestThumb(v.snippet.thumbnails),
    duration,
    views: Number(v.statistics?.viewCount) || 0,
    likes: Number(v.statistics?.likeCount) || 0,
    comments: Number(v.statistics?.commentCount) || 0,
    live: v.snippet.liveBroadcastContent || 'none', // live | upcoming | none
    isStream: Boolean(ls),
    scheduledStart: ls?.scheduledStartTime || null,
    concurrentViewers: ls?.concurrentViewers ? Number(ls.concurrentViewers) : null,
    tags: (v.snippet.tags || []).slice(0, 10),
    url: `https://www.youtube.com/watch?v=${v.id}`,
  };
}

async function fetchVideoDetails(ids) {
  const out = [];
  for (const group of chunk(ids, 50)) {
    const d = await yt('videos', {
      part: 'snippet,statistics,contentDetails,liveStreamingDetails',
      id: group.join(','),
      maxResults: 50,
    });
    out.push(...(d.items || []).map(normalizeVideo));
  }
  return out;
}

// Shorts detection: /shorts/<id> answers 200 for a Short and redirects otherwise.
// Results never change, so they are persisted to .cache/shorts.json.
const SHORTS_FILE = path.join(config.root, '.cache', 'shorts.json');
const shortCache = new Map(Object.entries(readJson(SHORTS_FILE)));

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return {}; }
}
const readSiteConfig = () => readJson(path.join(config.root, 'config', 'site.config.json'));
function saveShortCache() {
  try {
    fs.mkdirSync(path.dirname(SHORTS_FILE), { recursive: true });
    fs.writeFileSync(SHORTS_FILE, JSON.stringify(Object.fromEntries(shortCache)));
  } catch { /* read-only FS (serverless) → memory only */ }
}

async function isShort(id) {
  if (shortCache.has(id)) return shortCache.get(id);
  let result = null;
  try {
    const res = await fetch(`https://www.youtube.com/shorts/${id}`, {
      method: 'HEAD',
      redirect: 'manual',
      signal: AbortSignal.timeout(4000),
    });
    const loc = res.headers.get('location') || '';
    if (res.status === 200) result = true;
    else if (res.status >= 300 && res.status < 400 && !loc.includes('consent')) result = false;
  } catch { /* network issue → fall back to heuristic */ }
  if (result !== null) shortCache.set(id, result);
  return result;
}

/** Runs `fn` over items with at most `limit` in flight. */
async function pool(items, limit, fn) {
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) await fn(items[i++]);
  });
  await Promise.all(workers);
}

async function classify(videos) {
  const candidates = videos.filter((v) => !v.isStream && v.duration > 0 && v.duration <= 180);
  const before = shortCache.size;
  await pool(candidates, 32, async (v) => {
    const r = await isShort(v.id);
    v._short = r ?? (v.duration <= 60 || /#shorts?\b/i.test(`${v.title} ${v.description}`));
  });
  if (shortCache.size !== before) saveShortCache();
  for (const v of videos) {
    v.type = v.isStream ? 'stream' : v._short ? 'short' : 'video';
    delete v._short;
  }
  return videos;
}

async function uploadIds(limit) {
  const ch = await getChannel();
  const ids = [];
  let pageToken;
  do {
    const d = await yt('playlistItems', {
      part: 'contentDetails',
      playlistId: ch.uploads,
      maxResults: Math.min(50, limit),
      pageToken,
    });
    for (const it of d.items || []) ids.push(it.contentDetails.videoId);
    pageToken = d.nextPageToken;
  } while (pageToken && ids.length < limit);
  return ids.slice(0, limit);
}

const getVideos = () =>
  cached('videos', 20 * 60_000, async () => {
    // Pages must be fetched in order, but each page's details are fetched as soon as it arrives.
    const ch = await getChannel();
    const pending = [];
    let pageToken;
    let total = 0;
    do {
      const d = await yt('playlistItems', { part: 'contentDetails', playlistId: ch.uploads, maxResults: 50, pageToken });
      const ids = (d.items || []).map((it) => it.contentDetails.videoId).slice(0, config.maxVideos - total);
      total += ids.length;
      if (ids.length) pending.push(fetchVideoDetails(ids));
      pageToken = d.nextPageToken;
    } while (pageToken && total < config.maxVideos);
    const videos = (await Promise.all(pending)).flat();
    return analyse(await classify(videos), readSiteConfig().games);
  });

/* ------------------------------------------------------------------- live */

const getLive = () =>
  cached('live', 60_000, liveStatus, { swr: false });

async function liveStatus() {
  {
    const ch = await getChannel();
    const vids = await fetchVideoDetails(await uploadIds(10));
    const live = vids.find((v) => v.live === 'live');
    if (live) return { status: 'live', video: live, url: live.url, channelLiveUrl: ch.liveUrl };

    const soon = vids
      .filter((v) => v.live === 'upcoming' && v.scheduledStart && Date.parse(v.scheduledStart) > Date.now() - 2 * 3600_000)
      .sort((a, b) => Date.parse(a.scheduledStart) - Date.parse(b.scheduledStart))[0];
    if (soon) return { status: 'upcoming', video: soon, url: soon.url, channelLiveUrl: ch.liveUrl };

    return { status: 'offline', video: null, url: ch.liveUrl, channelLiveUrl: ch.liveUrl };
  }
}

/* --------------------------------------------------------------- comments */

async function videoComments(videoId, max = 20) {
  try {
    const d = await yt('commentThreads', {
      part: 'snippet',
      videoId,
      order: 'relevance',
      maxResults: max,
      textFormat: 'plainText',
    });
    return (d.items || []).map((t) => {
      const s = t.snippet.topLevelComment.snippet;
      return {
        id: t.id,
        videoId,
        author: s.authorDisplayName,
        authorChannelId: s.authorChannelId?.value || '',
        avatar: s.authorProfileImageUrl,
        authorUrl: s.authorChannelUrl,
        text: s.textDisplay,
        likes: s.likeCount || 0,
        replies: t.snippet.totalReplyCount || 0,
        publishedAt: s.publishedAt,
      };
    });
  } catch (err) {
    if (err.status === 403 || err.status === 404) return []; // comments disabled
    throw err;
  }
}

const getVideoComments = (videoId) => cached(`comments:${videoId}`, 30 * 60_000, () => videoComments(videoId, 15));

const getTopComments = () =>
  cached('topComments', 3 * 3600_000, async () => {
    const { videos } = await getVideos();
    const withComments = videos.filter((v) => v.live === 'none' && v.comments > 0);
    // Prefer the configured games (Roblox) over old/off-topic uploads.
    const featured = withComments.filter((v) => v.game !== 'other');
    const done = featured.length >= 4 ? featured : withComments;
    const pool = [
      ...[...done].sort((a, b) => b.score - a.score).slice(0, 8),
      ...[...done].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)).slice(0, 4),
    ];
    const unique = [...new Map(pool.map((v) => [v.id, v])).values()];
    const titles = new Map(unique.map((v) => [v.id, v.title]));

    const all = (await Promise.all(unique.map((v) => videoComments(v.id, 20)))).flat();
    return all
      .filter((c) => c.authorChannelId !== config.channelId && c.text.trim().length >= 3 && c.text.length <= 600)
      .sort((a, b) => b.likes - a.likes || b.replies - a.replies)
      .slice(0, 15)
      .map((c) => ({ ...c, videoTitle: titles.get(c.videoId) || '' }));
  });

async function isKnownVideo(id) {
  const { videos } = await getVideos();
  return videos.some((v) => v.id === id);
}

module.exports = { getChannel, getVideos, getLive, getVideoComments, getTopComments, isKnownVideo };
