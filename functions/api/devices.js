// Every device that ran a published faux123 driver, from FauxVkDB's own results (driver checks and speed tests),
// for the drivers page. Paul, 2026-11-01: these lists must fill themselves from FauxVkDB, never by hand edits.
// Cached at the edge for 10 minutes; a failed read is not cached, and the page keeps its built-in rows.
const SOURCE = "https://fauxvkdb.canonspike.com/api/driver-devices.json";
const TTL = 600;

export async function onRequestGet(context) {
  const cache = caches.default;
  const key = new Request(new URL("/api/devices", context.request.url).toString());
  const hit = await cache.match(key);
  if (hit) return hit;
  let body;
  try {
    const r = await fetch(SOURCE, { headers: { "User-Agent": "canonspike-drivers-page" } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    body = await r.json();
    if (!body || !body.turnip || !body.panvk) throw new Error("unexpected shape");
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e.message || e) }), {
      status: 502, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }
  const res = new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json", "Cache-Control": `public, max-age=${TTL}` },
  });
  context.waitUntil(cache.put(key, res.clone()));
  return res;
}
