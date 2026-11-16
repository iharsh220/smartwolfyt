async function get(path) {
  const res = await fetch(`/api/${path}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || res.statusText);
  return body;
}

export const api = {
  config: () => get('config'),
  channel: () => get('channel'),
  videos: () => get('videos'),
  live: () => get('live'),
  topComments: () => get('comments/top'),
  comments: (id) => get(`comments/${encodeURIComponent(id)}`),
  analytics: () => get('analytics'),
};
