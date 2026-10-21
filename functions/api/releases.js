// Latest GitHub release for each public driver repo, for the drivers page.
// Cached at the edge for 30 minutes so page views never hit GitHub's limits. Only the repos below are served.
//
// 2026-10-21: the API call (api.github.com) failed from Cloudflare's edge for every repo, so the page showed its
// built-in tags. The anonymous API limit (60 an hour) is per IP, and Workers share egress IPs with everyone else.
// The release page itself (github.com/<repo>/releases/latest) answers with a redirect to /releases/tag/<tag>
// and has no such limit, so it is tried first; the API stays as the fallback. `?debug=1` adds why each one failed.
const REPOS = [
  "turnip-faux123-driver",
  "panvk-faux123-driver-pixel7",
  "panvk-faux123-driver-ace",
  "panvk-faux123-driver-rp4pro",
  "panvk-faux123-driver-rg556",
];
const TTL = 1800;
const UA = { "User-Agent": "canonspike-drivers-page" };

async function fromRedirect(repo) {
  const r = await fetch(`https://github.com/faux123/${repo}/releases/latest`, { headers: UA, redirect: "manual" });
  const loc = r.headers.get("Location") || "";
  const m = loc.match(/\/releases\/tag\/([^/?#]+)$/);
  if (!m) throw new Error(`release page: HTTP ${r.status}, Location ${loc || "none"}`);
  const tag = decodeURIComponent(m[1]);
  return { tag, url: `https://github.com/faux123/${repo}/releases/tag/${m[1]}` };
}

async function fromApi(repo) {
  const r = await fetch(`https://api.github.com/repos/faux123/${repo}/releases/latest`, {
    headers: { ...UA, Accept: "application/vnd.github+json" },
  });
  if (!r.ok) throw new Error(`api: HTTP ${r.status} ${(await r.text()).slice(0, 120)}`);
  const j = await r.json();
  return { tag: j.tag_name, url: j.html_url };
}

export async function onRequestGet(context) {
  const debug = new URL(context.request.url).searchParams.has("debug");
  const cache = caches.default;
  const key = new Request(new URL("/api/releases", context.request.url).toString());
  if (!debug) {
    const hit = await cache.match(key);
    if (hit) return hit;
  }

  const out = {};
  const errors = {};
  await Promise.all(REPOS.map(async (repo) => {
    const why = [];
    for (const get of [fromRedirect, fromApi]) {
      try { out[repo] = await get(repo); return; } catch (e) { why.push(String(e.message || e)); }
    }
    errors[repo] = why; // the page keeps its built-in text for this repo
  }));
  const body = debug ? { ...out, _errors: errors } : out;
  const res = new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json", "Cache-Control": `public, max-age=${TTL}` },
  });
  if (!debug && Object.keys(out).length === REPOS.length) context.waitUntil(cache.put(key, res.clone()));
  return res;
}
