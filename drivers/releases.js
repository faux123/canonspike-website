// Fill each driver's "Latest public release" line with the live GitHub tag.
// The page carries no version numbers, so a release never needs a page edit.
// The line stays hidden until the tag arrives; if the request fails, the
// Download button still opens the repo's releases page.
(async () => {
  let data;
  try {
    const res = await fetch("/api/releases");
    if (!res.ok) return;
    data = await res.json();
  } catch { return; }
  for (const btn of document.querySelectorAll('.get a.btn[href*="github.com/faux123/"]')) {
    const repo = btn.href.split("github.com/faux123/")[1].split("/")[0];
    const rel = Object.hasOwn(data, repo) ? data[repo] : null;
    // Only the tag changes, so the words around it stay in the page's language.
    const ver = btn.parentElement.querySelector(".ver");
    const tag = ver && ver.querySelector(".tag");
    if (!rel || !tag || !String(rel.url).startsWith(`https://github.com/faux123/${repo}/releases/`)) continue;
    tag.textContent = rel.tag;
    btn.href = rel.url;
    ver.hidden = false;
  }
})();
