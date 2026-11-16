'use strict';
const fs = require('fs');
const path = require('path');
const express = require('express');
const config = require('../config/env');
const yt = require('../services/youtube');
const { getAnalytics } = require('../services/analytics');

const router = express.Router();
const SITE_CONFIG = path.join(config.root, 'config', 'site.config.json');

/**
 * Browser cache + shared CDN cache. On Netlify the CDN answers repeat requests, so the
 * function (and the YouTube quota) is hit at most once per `maxAge` instead of per visitor.
 */
function setCache(res, maxAge) {
  res.set('Cache-Control', `public, max-age=${maxAge}`);
  if (maxAge > 0) {
    res.set('Netlify-CDN-Cache-Control', `public, durable, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 10}`);
  }
}

/** Wraps an async handler: JSON response, caching, safe error message. */
const handle = (fn, maxAge = 60) => async (req, res) => {
  try {
    setCache(res, maxAge);
    res.json(await fn(req));
  } catch (err) {
    console.error(`[api] ${req.originalUrl}: ${err.message}`);
    res.status(err.status === 400 ? 400 : 502).json({ error: err.status === 400 ? err.message : 'Could not load data from YouTube right now.' });
  }
};

const badRequest = (msg) => Object.assign(new Error(msg), { status: 400 });

// Re-read on each request so edits to site.config.json show up without restart.
router.get('/config', handle(async () => JSON.parse(await fs.promises.readFile(SITE_CONFIG, 'utf8')), 0));
router.get('/channel', handle(() => yt.getChannel(), 300));
router.get('/videos', handle(() => yt.getVideos(), 120));
router.get('/live', handle(() => yt.getLive(), 20));
router.get('/comments/top', handle(() => yt.getTopComments(), 600));
router.get(
  '/comments/:id',
  handle(async (req) => {
    const { id } = req.params;
    if (!/^[\w-]{11}$/.test(id) || !(await yt.isKnownVideo(id))) throw badRequest('Unknown video');
    return yt.getVideoComments(id);
  }, 600),
);
router.get('/analytics', async (req, res) => {
  try {
    setCache(res, 600);
    res.json(await getAnalytics());
  } catch (err) {
    console.error(`[api] analytics: ${err.message}`);
    res.json({ available: false, reason: 'Analytics temporarily unavailable' });
  }
});

module.exports = router;
