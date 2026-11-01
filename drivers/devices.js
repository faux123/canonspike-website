// Fill each driver's device list, chip list, and chip count from FauxVkDB results (/api/devices).
// Paul, 2026-11-01: these lists must update by themselves from what FauxVkDB collects, never by a page edit.
// The rows written in the page stay as the fallback and for proof FauxVkDB does not hold (player reports);
// a device FauxVkDB knows is shown from FauxVkDB. Words come from the page itself, so every language keeps its own.
(async () => {
  let data;
  try {
    const res = await fetch("/api/devices");
    if (!res.ok) return;
    data = await res.json();
  } catch { return; }

  const legend = (cls) => {
    const b = document.querySelector(`.legend .badge.${cls}`);
    return b ? b.textContent : "";
  };
  // Link words, read from rows the page ships in every language: report 4 is a driver check, 641 a speed test.
  const linkWord = (id, fallback) => {
    const a = document.querySelector(`.devs .src a[href$="/report/${id}"]`);
    return a ? a.textContent : fallback;
  };
  const words = { check: linkWord(4, "Test result"), speed: linkWord(641, "Speed test") };
  // "AYN Odin2 Portal" and "AYN Odin 2 Portal", "Galaxy S21+ 5G" and "Galaxy S21+" are one device.
  const norm = (s) => String(s || "").toLowerCase().replace(/^moorechip\s+/, "").replace(/\s+5g$/, "").replace(/[^a-z0-9+]+/g, "");
  const chipName = (fam, gpu) => {
    const m = fam === "adreno" ? String(gpu).match(/Adreno \d{3}/) : String(gpu).match(/Mali-G\d+/);
    return m ? m[0] : String(gpu || "");
  };
  const span = (cls, text, notr) => {
    const s = document.createElement("span");
    s.className = cls;
    s.textContent = text;
    if (notr) s.setAttribute("translate", "no");
    return s;
  };
  const row = (fam, dev, kind, report, problems, home) => {
    const li = document.createElement("li");
    if (home) li.className = "is-home";
    // FauxVkDB names Retroid handhelds by their maker field, "Moorechip"; players know them as Retroid.
    li.append(span("dev", String(dev).replace(/^Moorechip\s+/, ""), true), span("chip-name", chipName(fam, kind.gpu), true));
    const cls = home ? "b-home" : problems > 0 ? "b-part" : "b-ok";
    li.append(span(`badge ${cls}`, legend(cls)));
    const src = span("src", "");
    const a = document.createElement("a");
    a.href = `https://fauxvkdb.canonspike.com/report/${report}`;
    a.textContent = kind.speed ? words.speed : words.check;
    src.append(a);
    li.append(src);
    return li;
  };

  for (const [fam, line] of [["adreno", "turnip"], ["mali", "panvk"]]) {
    const card = document.getElementById(line);
    const feed = data[line];
    const list = card && card.querySelector("ul.devs");
    if (!list || !feed) continue;
    const staticRows = [...list.children];
    const homeNames = new Set(staticRows.filter((li) => li.classList.contains("is-home"))
      .map((li) => norm(li.querySelector(".dev")?.textContent)));
    // One row per device: its newest driver check, else its newest speed test.
    const seen = new Map();
    for (const c of feed.checks || []) {
      const k = norm(c.device);
      if (!seen.has(k)) seen.set(k, row(fam, c.device, { gpu: c.gpu }, c.report, c.problems, homeNames.has(k)));
    }
    for (const s of feed.speed || []) {
      const k = norm(s.device);
      if (!seen.has(k)) seen.set(k, row(fam, s.device, { gpu: s.gpu, speed: true }, s.report, 0, homeNames.has(k)));
    }
    if (!seen.size) continue;
    // Built-on devices first, then FauxVkDB rows (newest first), then the page's own rows FauxVkDB does not cover.
    const live = [...seen.values()];
    const kept = staticRows.filter((li) => !seen.has(norm(li.querySelector(".dev")?.textContent)));
    const home = [...live.filter((li) => li.classList.contains("is-home")), ...kept.filter((li) => li.classList.contains("is-home"))];
    const rest = [...live.filter((li) => !li.classList.contains("is-home")), ...kept.filter((li) => !li.classList.contains("is-home"))];
    list.replaceChildren(...home, ...rest);

    // Chips it has run on: every chip in the list, sorted by number; the card's count follows.
    const chipsBox = card.querySelector(".chips");
    const homeChips = new Set([...(chipsBox?.querySelectorAll(".gpu.home") || [])].map((g) => g.textContent));
    const chips = [...new Set([...list.querySelectorAll(".chip-name")].map((c) => chipName(fam, c.textContent)).filter(Boolean))]
      .sort((x, y) => parseInt(x.replace(/\D+/g, "")) - parseInt(y.replace(/\D+/g, "")));
    if (chipsBox && chips.length) {
      chipsBox.replaceChildren(...chips.map((c) => span(homeChips.has(c) ? "gpu home" : "gpu", c)));
    }
    const count = document.querySelector(`.glance a[href="#${line}"] .count`);
    if (count && chips.length && count.firstChild && count.firstChild.nodeType === Node.TEXT_NODE) {
      count.firstChild.textContent = String(chips.length);
    }
    // The card's range ("Adreno 660 to 840") keeps its words; only its two numbers follow the chip list.
    const word = document.querySelector(`.glance a[href="#${line}"] .word`);
    const nums = chips.map((c) => parseInt(c.replace(/\D+/g, ""))).filter((n) => !Number.isNaN(n));
    if (word && nums.length) {
      let i = 0;
      const ends = [Math.min(...nums), Math.max(...nums)];
      const text = word.textContent;
      if ((text.match(/\d+/g) || []).length === 2) word.textContent = text.replace(/\d+/g, () => String(ends[i++]));
    }
  }
})();
