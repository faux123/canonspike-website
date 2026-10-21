// Replace each driver's built-in release tag with the live GitHub tag.
// If the request fails, the text written in the page stays.
(async () => {
  let data;
  try { data = await (await fetch("/api/releases")).json(); } catch { return; }
  for (const btn of document.querySelectorAll('.get a.btn[href*="github.com/faux123/"]')) {
    const repo = btn.href.split("github.com/faux123/")[1].split("/")[0];
    const rel = data[repo];
    // Only the tag changes, so the words around it stay in the page's language.
    const tag = btn.parentElement.querySelector(".ver .tag");
    if (!rel || !tag) continue;
    tag.textContent = rel.tag;
    btn.href = rel.url;
  }
})();
