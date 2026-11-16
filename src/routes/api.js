'use strict';
const fs = require('fs');
const path = require('path');
const express = require('express');
const config = require('../config/env');
const yt = require('../services/youtube');
const { getAnalytics } = require('../services/analytics');

const router = express.Router();
const SITE_CONFIG = path.join(config.root, 'config', 'site.config.json');

/** Wraps an async handler: JSON response, short browser cache, safe error message. */
const handle = (fn, maxAge = 60) => async (req, res) => {
  try {
    res.set('Cache-Control', `public, max-age=${maxAge}`);
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
    res.set('Cache-Control', 'public, max-age=600');
    res.json(await getAnalytics());
  } catch (err) {
    console.error(`[api] analytics: ${err.message}`);
    res.json({ available: false, reason: 'Analytics temporarily unavailable' });
  }
});

module.exports = router;
