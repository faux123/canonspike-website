#!/usr/bin/env python3
"""Build the translated copies of a small static site.

    python3 tool/i18n.py extract   # write i18n/en.txt from the English pages
    python3 tool/i18n.py build     # write <out>/<prefix>/<page> for every language
    python3 tool/i18n.py check     # fail if en.txt or any built page is out of date
    python3 tool/i18n.py prefixes  # print the language folders, for a deploy script

How it works. The English pages are the source. `extract` lists every piece of
visible text (one paragraph, heading, list item, link label, or description per
line) in i18n/en.txt. i18n/<prefix>.txt holds the same lines translated, in the
same order: line 12 of de.txt is the German for line 12 of en.txt. `build`
copies each English page, swaps each piece for its translation, sets the page
language, points internal links at the same language, and writes the language
list and the hreflang links on every page, the English ones included.

When you change English text: run `extract`, then change the same line numbers
in every i18n/<prefix>.txt, then run `build`. `build` refuses to run while
en.txt is stale, and refuses a translation whose links or <code> text differ
from the English line.

Settings are in i18n/config.json. Standard library only.

Copied 2026-10-21 from fauxcooling-site/tool/i18n.py and changed for a site whose
translated part lives in one folder (canonspike.com/drivers/): `base_path` puts
the language folders under it (/drivers/de/), only the links listed in
`localized_links` move to the same language (the rest of canonspike.com is
English only), the canonical link follows the language, and a language menu
like FauxVkDB's goes in the header after `language_menu_after`.
"""
from __future__ import annotations

import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
CFG = json.loads((SITE / "i18n" / "config.json").read_text(encoding="utf-8"))
SRC = SITE / CFG["source_dir"]
OUT = SITE / CFG["output_dir"]
PAGES: list[str] = CFG["pages"]
LEGAL: set[str] = set(CFG.get("legal_pages", []))
LANGS: list[dict] = CFG["languages"]  # prefix, lang, name, optional dir
EXTRA = json.loads((SITE / "i18n" / "extra.json").read_text(encoding="utf-8"))

INLINE = {"a", "abbr", "b", "code", "em", "i", "img", "kbd", "small", "span", "strong", "sub", "sup", "time"}
VOID = {"br", "img", "meta", "link", "input", "hr", "source"}
SKIP = {"script", "style", "pre"}
ATTRS = (("meta", "content"), ("img", "alt"))
META_NAMES = {"description", "og:title", "og:description", "og:site_name", "og:image:alt", "twitter:title", "twitter:description"}
ALT_OPEN, ALT_CLOSE = "<!-- i18n:alternates -->", "<!-- /i18n:alternates -->"
LIST_OPEN, LIST_CLOSE = "<!-- i18n:languages -->", "<!-- /i18n:languages -->"
MENU_OPEN, MENU_CLOSE = "<!-- i18n:menu -->", "<!-- /i18n:menu -->"
BASE = CFG.get("base_path", "").rstrip("/")
GLOBE = ('<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/>'
         '<path d="M3 12h18M12 3c2.6 2.5 3.9 5.5 3.9 9s-1.3 6.5-3.9 9c-2.6-2.5-3.9-5.5-3.9-9s1.3-6.5 3.9-9z"/></svg>')


class Tokens(HTMLParser):
    """Flat token list with source offsets, so text can be replaced in place."""

    def __init__(self, text: str) -> None:
        super().__init__(convert_charrefs=False)
        self.text = text
        self.starts = [0]
        for line in text.split("\n")[:-1]:
            self.starts.append(self.starts[-1] + len(line) + 1)
        self.out: list[tuple[str, str, int, dict]] = []
        self.feed(text)
        self.close()

    def at(self) -> int:
        line, col = self.getpos()
        return self.starts[line - 1] + col

    def handle_starttag(self, tag, attrs):
        self.out.append(("start", tag, self.at(), dict(attrs)))

    def handle_startendtag(self, tag, attrs):
        self.out.append(("start", tag, self.at(), dict(attrs)))
        self.out.append(("end", tag, self.at() + len(self.get_starttag_text()), {}))

    def handle_endtag(self, tag):
        self.out.append(("end", tag, self.at(), {}))

    def handle_data(self, data):
        self.out.append(("text", "", self.at(), {}))

    def handle_entityref(self, name):
        self.out.append(("text", "", self.at(), {}))

    def handle_charref(self, name):
        self.out.append(("text", "", self.at(), {}))

    def handle_comment(self, data):
        self.out.append(("comment", "", self.at(), {}))

    def handle_decl(self, decl):
        self.out.append(("comment", "", self.at(), {}))


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def has_words(html: str) -> bool:
    return bool(re.search(r"[^\W\d_]{2,}", re.sub(r"<[^>]*>", " ", html)))


def segments(text: str) -> list[tuple[int, int]]:
    """Source spans of every translatable piece, in page order."""
    toks = Tokens(text).out
    ends = [t[2] for t in toks[1:]] + [len(text)]
    spans: list[tuple[int, int]] = []
    run: list[int] = []
    skip_depth = 0
    skip_stack: list[bool] = []

    def flush() -> None:
        nonlocal run
        if run:
            a, b = toks[run[0]][2], ends[run[-1]]
            raw = text[a:b]
            a += len(raw) - len(raw.lstrip())
            b -= len(raw) - len(raw.rstrip())
            piece = text[a:b]
            links = list(re.finditer(r"<a\b[^>]*>(.*?)</a>", piece, re.S))
            only_links = len(links) > 1 and not norm(re.sub(r"<a\b[^>]*>.*?</a>", "", piece, flags=re.S))
            if only_links:  # a row of links (menu, footer): one piece per label
                for m in links:
                    if has_words(m.group(1)):
                        spans.append((a + m.start(1), a + m.end(1)))
            elif has_words(piece):
                spans.append((a, b))
        run = []

    for i, (kind, tag, _pos, attrs) in enumerate(toks):
        if kind == "start" and tag not in VOID:
            hidden = tag in SKIP or attrs.get("translate") == "no"
            if hidden and not skip_depth:
                flush()
            skip_stack.append(hidden)
            skip_depth += hidden
            if hidden:
                continue
        elif kind == "end" and tag not in VOID and skip_stack:
            was = skip_stack.pop()
            skip_depth -= was
            if was:
                continue
        if skip_depth:
            continue
        if kind == "text" or (kind in ("start", "end") and tag in INLINE):
            run.append(i)
        else:
            flush()
    flush()

    # Text held in attributes, where no visible piece already covers it.
    for kind, tag, pos, attrs in toks:
        if kind != "start" or any(a <= pos < b for a, b in spans):
            continue
        for want_tag, attr in ATTRS:
            if tag != want_tag or not attrs.get(attr):
                continue
            if tag == "meta" and (attrs.get("name") or attrs.get("property")) not in META_NAMES:
                continue
            end = text.index(">", pos)
            m = re.search(rf'\b{attr}="([^"]*)"', text[pos:end])
            if m and has_words(m.group(1)):
                spans.append((pos + m.start(1), pos + m.end(1)))
    return sorted(spans)


def english() -> list[str]:
    seen: list[str] = []
    for page in PAGES:
        text = (SRC / page).read_text(encoding="utf-8")
        for a, b in segments(text):
            key = norm(text[a:b])
            if key not in seen:
                seen.append(key)
    return seen


def signature(piece: str) -> list[str]:
    """What a translation must keep: its tags, link targets, and <code> text."""
    tags = sorted(re.findall(r"<(/?[a-z0-9]+)", piece))
    targets = sorted(re.findall(r'\b(?:href|src)="([^"]*)"', piece))
    code = sorted(re.findall(r"<code>(.*?)</code>", piece, re.S))
    return tags + targets + code


def page_url(prefix: str, page: str) -> str:
    stem = "" if page == "index.html" else page.removesuffix(".html")
    return f"{BASE}/{prefix}/{stem}" if prefix else f"{BASE}/{stem}"


def alternates(page: str) -> str:
    base = CFG["site_url"].rstrip("/")
    rows = [f'<link rel="alternate" hreflang="en" href="{base}{page_url("", page)}">']
    rows += [f'<link rel="alternate" hreflang="{l["lang"]}" href="{base}{page_url(l["prefix"], page)}">' for l in LANGS]
    rows.append(f'<link rel="alternate" hreflang="x-default" href="{base}{page_url("", page)}">')
    return ALT_OPEN + "\n" + "\n".join(rows) + "\n" + ALT_CLOSE


def language_list(page: str, current: str) -> str:
    items = [("", "en", "English")] + [(l["prefix"], l["lang"], l["name"]) for l in LANGS]
    links = "".join(
        f'<a href="{page_url(p, page)}" lang="{code}"' + (' aria-current="true"' if p == current else "") + f">{name}</a>"
        for p, code, name in items
    )
    return f'{LIST_OPEN}<nav class="langs" translate="no" aria-label="Languages">{links}</nav>{LIST_CLOSE}'


def language_menu(page: str, current: str) -> str:
    """The header menu: a globe and the current language's name, opening the list (FauxVkDB's .langmenu)."""
    items = [("", "en", "English")] + [(l["prefix"], l["lang"], l["name"]) for l in LANGS]
    now = next((code, name) for p, code, name in items if p == current)
    rows = "".join(
        f'<li><a href="{page_url(p, page)}" hreflang="{code}" lang="{code}"'
        + (' aria-current="true"' if p == current else "") + f">{name}</a></li>"
        for p, code, name in items
    )
    return (f'{MENU_OPEN}<details class="langmenu" translate="no"><summary aria-label="{EXTRA.get(current, {}).get('language', 'Language')}: {now[1]}">{GLOBE}'
            f'<span lang="{now[0]}">{now[1]}</span></summary><ul>{rows}</ul></details>{MENU_CLOSE}')


def with_blocks(text: str, page: str, current: str) -> str:
    """Put the hreflang links, the header menu, and the footer language list on a page, replacing old ones."""
    text = re.sub(re.escape(ALT_OPEN) + r".*?" + re.escape(ALT_CLOSE) + r"\n?", "", text, flags=re.S)
    text = re.sub(re.escape(LIST_OPEN) + r".*?" + re.escape(LIST_CLOSE), "", text, flags=re.S)
    text = re.sub(re.escape(MENU_OPEN) + r".*?" + re.escape(MENU_CLOSE), "", text, flags=re.S)
    menu_at = CFG.get("language_menu_after")
    if menu_at:
        if menu_at not in text:
            sys.exit(f"FAILED: {page} has no {menu_at!r} to hold the language menu")
        cut = text.index(menu_at) + len(menu_at)
        text = text[:cut] + language_menu(page, current) + text[cut:]
    text = text.replace("</head>", alternates(page) + "\n</head>", 1)
    anchor = CFG["language_list_before"]
    if anchor not in text:
        sys.exit(f"FAILED: {page} has no {anchor} to hold the language list")
    cut = text.rindex(anchor)
    return text[:cut] + language_list(page, current) + text[cut:]


def translate(page: str, lang: dict, en: list[str], tr: list[str]) -> str:
    text = (SRC / page).read_text(encoding="utf-8")
    table = dict(zip(en, tr))
    for a, b in reversed(segments(text)):
        text = text[:a] + table[norm(text[a:b])] + text[b:]
    prefix = lang["prefix"]
    direction = f' dir="{lang["dir"]}"' if lang.get("dir") else ""
    text = re.sub(r'<html lang="en"', f'<html lang="{lang["lang"]}"{direction}', text, count=1)
    moved = set(CFG.get("localized_links", []))

    def relink(m: re.Match) -> str:
        url, _, frag = m.group(1).partition("#")
        if url not in moved:
            return m.group(0)
        return f'href="{BASE}/{prefix}/' + url[len(BASE) + 1:] + (f"#{frag}" if frag else "") + '"'

    text = re.sub(r'href="(/[^"]*)"', relink, text)
    # A page one folder down still has to find assets/ and the stylesheet.
    text = re.sub(r'\b(src|href)="(?![/#]|[a-z][a-z0-9+.-]*:)([^"]+)"', r'\1="/\2"', text)
    base = CFG["site_url"].rstrip("/")
    text = re.sub(
        r'(<link rel="canonical" href=")[^"]*(")',
        lambda m: m.group(1) + base + page_url(prefix, page) + m.group(2),
        text,
    )
    text = re.sub(
        r'(<meta property="og:url" content=")[^"]*(")',
        lambda m: m.group(1) + base + page_url(prefix, page) + m.group(2),
        text,
    )
    if page in LEGAL:
        note = EXTRA[prefix]["legal_note"]
        english_link = f'<a href="{page_url("", page)}" hreflang="en" lang="en">English</a>'
        text = text.replace("</h1>", f'</h1>\n<p class="{CFG["note_class"]}">{note} {english_link}</p>', 1)
    return with_blocks(text, page, prefix)


def plan() -> dict[Path, str]:
    """Every file `build` writes, with its content."""
    en = english()
    stored = (SITE / "i18n" / "en.txt").read_text(encoding="utf-8").split("\n")
    stored = stored[:-1] if stored and stored[-1] == "" else stored
    if stored != en:
        changed = [i + 1 for i, (x, y) in enumerate(zip(stored, en)) if x != y][:5]
        sys.exit(
            f"FAILED: i18n/en.txt is stale ({len(stored)} lines stored, {len(en)} on the pages; first differing "
            f"lines {changed or 'at the end'}). Run `extract`, then update the same lines in every language file."
        )
    files: dict[Path, str] = {}
    for page in PAGES:
        files[SRC / page] = with_blocks((SRC / page).read_text(encoding="utf-8"), page, "")
    for lang in LANGS:
        path = SITE / "i18n" / f"{lang['prefix']}.txt"
        tr = path.read_text(encoding="utf-8").split("\n")
        tr = tr[:-1] if tr and tr[-1] == "" else tr
        if len(tr) != len(en):
            sys.exit(f"FAILED: {path.name} has {len(tr)} lines, en.txt has {len(en)}")
        for n, (e, t) in enumerate(zip(en, tr), 1):
            if not t.strip():
                sys.exit(f"FAILED: {path.name} line {n} is empty")
            if signature(e) != signature(t):
                sys.exit(f"FAILED: {path.name} line {n} does not keep the tags, links, or <code> text of en.txt line {n}")
        if lang["prefix"] not in EXTRA or not EXTRA[lang["prefix"]].get("legal_note"):
            sys.exit(f"FAILED: i18n/extra.json has no legal_note for {lang['prefix']}")
        for page in PAGES:
            files[OUT / lang["prefix"] / page] = translate(page, lang, en, tr)
    return files


def main() -> None:
    mode = sys.argv[1] if len(sys.argv) > 1 else ""
    if mode == "extract":
        en = english()
        (SITE / "i18n" / "en.txt").write_text("\n".join(en) + "\n", encoding="utf-8")
        print(f"i18n/en.txt: {len(en)} lines from {len(PAGES)} pages")
    elif mode == "build":
        files = plan()
        for path, content in files.items():
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding="utf-8")
        print(f"built {len(files)} pages: English plus {len(LANGS)} languages")
    elif mode == "check":
        stale = [str(p.relative_to(SITE)) for p, c in plan().items() if not p.exists() or p.read_text(encoding="utf-8") != c]
        if stale:
            sys.exit(f"FAILED: {len(stale)} pages are out of date, run `build`: {stale[:6]}")
        print("i18n: en.txt and every built page are current")
    elif mode == "prefixes":  # for a deploy script: the folders `build` writes
        print(" ".join(l["prefix"] for l in LANGS))
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
