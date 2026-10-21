#!/usr/bin/env bash
# Publish canonspike.com (Cloudflare Pages project canonspike-website; a git push does not publish it).
#
#   bash tool/deploy.sh
#
# Uploads a clean export of the committed tree (HEAD), minus the translation tooling, so .git, .wrangler,
# tool/, and i18n/ never reach the site. Refuses while the translated drivers pages are out of date.
set -euo pipefail
cd "$(dirname "$0")/.."
python3 tool/i18n.py check
if ! git diff --quiet HEAD -- drivers; then
  echo "FAILED: drivers/ has uncommitted changes; commit them first (the deploy uploads HEAD)" >&2
  exit 1
fi
out=$(mktemp -d)
trap 'rm -rf "$out"' EXIT
git archive HEAD | tar -x -C "$out"
rm -rf "$out/tool" "$out/i18n"
cd "$out"
npx --yes wrangler@latest pages deploy . --project-name canonspike-website --branch main --commit-dirty=true
