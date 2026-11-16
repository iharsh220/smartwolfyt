'use strict';
const path = require('path');
const express = require('express');
const config = require('./src/config/env');
const apiRouter = require('./src/routes/api');
const yt = require('./src/services/youtube');

const app = express();
app.disable('x-powered-by');

app.use('/api', apiRouter);
app.use(express.static(path.join(config.root, 'public'), { maxAge: '1h', extensions: ['html'] }));
app.use((req, res) => res.status(404).sendFile(path.join(config.root, 'public', 'index.html')));

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`\n🎮  Portfolio running → http://localhost:${config.port}`);
    console.log(`    Analytics: ${config.oauth.enabled ? 'enabled' : 'disabled (OAuth vars missing)'}\n`);
    // Warm the cache so the first visitor doesn't wait.
    const t = Date.now();
    yt.getVideos()
      .then(() => { console.log(`    Cache warmed in ${((Date.now() - t) / 1000).toFixed(1)}s`); return yt.getTopComments(); })
      .catch((e) => console.warn(`    Cache warm-up failed: ${e.message}`));
  });
}

module.exports = app;
