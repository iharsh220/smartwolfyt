'use strict';

const store = new Map();
const inflight = new Map();

function refresh(key, ttlMs, fn, previous) {
  if (inflight.has(key)) return inflight.get(key);
  const p = (async () => {
    try {
      const val = await fn();
      store.set(key, { val, exp: Date.now() + ttlMs });
      return val;
    } catch (err) {
      if (previous) {
        console.warn(`[cache] ${key} refresh failed, keeping stale: ${err.message}`);
        store.set(key, { val: previous.val, exp: Date.now() + 60_000 });
        return previous.val;
      }
      throw err;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p;
}

/**
 * Stale-while-revalidate cache.
 * - Fresh hit → returned immediately.
 * - Expired hit → stale value returned immediately, refresh runs in background.
 * - Miss → waits for `fn` (concurrent callers share one request).
 * Set `swr: false` for data that must never be stale (e.g. live status).
 */
async function cached(key, ttlMs, fn, { swr = true } = {}) {
  const hit = store.get(key);
  if (hit && hit.exp > Date.now()) return hit.val;
  if (hit && swr) {
    refresh(key, ttlMs, fn, hit).catch(() => {});
    return hit.val;
  }
  return refresh(key, ttlMs, fn, hit);
}

module.exports = { cached };
