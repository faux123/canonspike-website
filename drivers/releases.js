// Replace each driver's built-in "Latest public release" text with the live GitHub tag.
// If the request fails, the text written in the page stays.
(async () => {
  let data;
  try { data = await (await fetch("/api/releases")).json(); } catch { return; }
  for (const btn of document.querySelectorAll('.get a.btn[href*="github.com/faux123/"]')) {
    const repo = btn.href.split("github.com/faux123/")[1].split("/")[0];
    const rel = data[repo];
    const ver = btn.parentElement.querySelector(".ver");
    if (!rel || !ver) continue;
    ver.textContent = `Latest public release ${rel.tag}`;
    btn.href = rel.url;
  }
})();
