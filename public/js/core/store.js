/**
 * Tiny global store + event bus.
 *   store.set('live', data)   → emits 'live'
 *   store.on('live', fn)      → fn(data) on each change
 */
const listeners = new Map();

export const store = {
  state: {
    config: null,
    channel: null,
    data: null, // /api/videos payload
    live: null,
    byId: new Map(),
  },

  set(key, value) {
    this.state[key] = value;
    if (key === 'data' && value) this.state.byId = new Map(value.videos.map((v) => [v.id, v]));
    this.emit(key, value);
  },

  on(key, fn) {
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key).add(fn);
    return () => listeners.get(key).delete(fn);
  },

  emit(key, value) {
    for (const fn of listeners.get(key) || []) fn(value);
  },

  video(id) {
    return this.state.byId.get(id) || (this.state.live?.video?.id === id ? this.state.live.video : null);
  },
};
