# SmartWolf · Gaming Portfolio

A 3D, Roblox-style portfolio for the **SmartWolf** YouTube channel (Steal an Egg · Blox Fruits). It runs on live YouTube data and works on phones first.

- 🔴 **Live alert.** When a stream starts, the site shows a red strip and a popup, and plays the stream with **live chat** next to it.
- 🥚 **My Games.** Stats per game, plus a filter that shows only that game's videos.
- 🏆 **Hall of Fame.** Best stream, video and Short with rarity tiers, chosen from real stats, with the reasons each one won.
- 📦 **Inventory.** All uploads, with filters by type, game and period and sorting by latest, best, views, likes, comments, engagement or length.
- ⚡ **Stats.** Channel totals and a 30-day chart from YouTube Analytics.
- 💬 **Best comments** from the community.
- 🌗 Dark and light mode follow the device. Works on phone, tablet and desktop.

Built with **Node.js + Express** for the API and plain **HTML, CSS and JavaScript** for the page. The 3D scene uses **Three.js**. There is no build step.

## Run locally

```bash
npm install
cp .env.example .env      # then fill in your keys
npm run dev               # http://localhost:3000
```

Preview the live and upcoming states without streaming:

- http://localhost:3000/?preview=live
- http://localhost:3000/?preview=upcoming

## Edit content

Everything that isn't code is in **`config/site.config.json`**:

- tagline, schedule, social links and sponsor email
- `games[]`: name, emoji, color, and the `match` keywords used to sort videos by game

No restart is needed for most changes. The game sorting refreshes within 20 minutes, or immediately after a restart.

## Project structure

```
server.js                  Express app (serves /public + /api)
config/site.config.json    editable content
src/config/env.js          reads .env
src/lib/                   cache (stale-while-revalidate) + formatters
src/services/youtube.js    Data API: channel, videos, live status, comments
src/services/insights.js   scoring, best picks and reasons, records, game tagging
src/services/analytics.js  OAuth + YouTube Analytics reports
src/routes/api.js          /api/* endpoints
public/index.html          the page
public/css/                tokens → base → components → sections
public/js/main.js          entry
public/js/core/            api, store, theme, utils, icons, games
public/js/components/      video card, modal, comment
public/js/sections/        hero, live, games, best, library, stats, comments, about
public/js/effects/         tilt, reveal, count-up
public/js/three/scene.js   3D hero scene
```

## API

| Endpoint | Cache | What |
|---|---|---|
| `GET /api/channel` | 30 min | channel info + stats |
| `GET /api/videos` | 20 min | all uploads + best picks, records and totals |
| `GET /api/live` | 60 s | `live` / `upcoming` / `offline` |
| `GET /api/comments/top` | 3 h | best comments |
| `GET /api/comments/:id` | 30 min | top comments of one video |
| `GET /api/analytics` | 3 h | last 30 days (needs the OAuth vars) |
| `GET /api/config` | none | `site.config.json` |

Quota: about 3,500 of the 10,000 daily YouTube API units. The API keys stay on the server; the browser only calls `/api/*`.

## Deploy (Render, free)

1. Push this repo to GitHub.
2. On render.com, create a **New → Web Service** from the repo.
3. Set the build command to `npm install` and the start command to `npm start`.
4. Add the variables from `.env` under **Environment**.
5. Deploy, then put the site link in your YouTube channel description and video descriptions.

---

Fan-made creator portfolio. Not affiliated with Roblox Corporation or YouTube.
