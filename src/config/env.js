'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

// Load .env (Node >= 20.12 has this built in, no dotenv needed). On hosts like
// Render/Vercel the variables come from the dashboard and there is no file.
try { process.loadEnvFile(path.join(ROOT, '.env')); } catch { /* no .env file */ }

const env = process.env;

let clientId = env.GOOGLE_CLIENT_ID;
let clientSecret = env.GOOGLE_CLIENT_SECRET;

// Fallback: read OAuth client from the downloaded client_secret_*.json
if (!clientId || !clientSecret) {
  try {
    const file = fs.readdirSync(ROOT).find((n) => /^client_secret.*\.json$/.test(n));
    if (file) {
      const json = JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
      const c = json.web || json.installed || {};
      clientId = clientId || c.client_id;
      clientSecret = clientSecret || c.client_secret;
    }
  } catch { /* ignore */ }
}

const config = {
  root: ROOT,
  port: Number(env.PORT) || 3000,
  apiKey: env.YOUTUBE_API_KEY || env.APIKEY,
  channelId: env.YOUTUBE_CHANNEL_ID || env.CHANNELID,
  maxVideos: Number(env.MAX_VIDEOS) || 1000,
  oauth: {
    clientId,
    clientSecret,
    refreshToken: env.GOOGLE_REFRESH_TOKEN,
  },
};

config.oauth.enabled = Boolean(config.oauth.clientId && config.oauth.clientSecret && config.oauth.refreshToken);

const missing = [];
if (!config.apiKey) missing.push('YOUTUBE_API_KEY');
if (!config.channelId) missing.push('YOUTUBE_CHANNEL_ID');
if (missing.length) {
  console.error(`\n✖ Missing ${missing.join(', ')} in .env — see CLAUDE.md\n`);
  process.exit(1);
}

module.exports = config;
