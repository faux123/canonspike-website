// Latest GitHub release for each public driver repo, for the drivers page.
// Cached at the edge for 30 minutes so page views never hit GitHub's
// 60-requests-per-hour anonymous limit. Only the repos below are served.
const REPOS = [
  "turnip-faux123-driver",
  "panvk-faux123-driver-pixel7",
  "panvk-faux123-driver-ace",
  "panvk-faux123-driver-rp4pro",
  "panvk-faux123-driver-rg556",
];
const TTL = 1800;

async function latest(repo) {
  const r = await fetch(`https://api.github.com/repos/faux123/${repo}/releases/latest`, {
    headers: { "User-Agent": "canonspike-drivers-page", Accept: "application/vnd.github+json" },
  });
  if (!r.ok) return null;
  const j = await r.json();
  return { tag: j.tag_name, url: j.html_url, date: (j.published_at || "").slice(0, 10) };
}

export async function onRequestGet(context) {
  const cache = caches.default;
  const key = new Request(new URL("/api/releases", context.request.url).toString());
  const hit = await cache.match(key);
  if (hit) return hit;

  const out = {};
  await Promise.all(REPOS.map(async (repo) => {
    try { const v = await latest(repo); if (v) out[repo] = v; } catch { /* page keeps its built-in text */ }
  }));
  const res = new Response(JSON.stringify(out), {
    headers: { "Content-Type": "application/json", "Cache-Control": `public, max-age=${TTL}` },
  });
  if (Object.keys(out).length === REPOS.length) context.waitUntil(cache.put(key, res.clone()));
  return res;
}
