'use strict';
/**
 * Netlify Function: runs the same Express app that `npm run dev` runs locally.
 * netlify.toml rewrites /api/* → /.netlify/functions/api/*; static files come from /public via the CDN.
 */
const serverless = require('serverless-http');
const app = require('../../server');

exports.handler = serverless(app);
