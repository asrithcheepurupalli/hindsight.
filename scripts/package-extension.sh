#!/usr/bin/env bash
# package-extension.sh — produce the Chrome Web Store upload zip for hindsight.
#
# The extension is plain MV3, no build step: everything in extension/ ships
# as-is. The zip excludes store assets and docs.
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION=$(node -e "console.log(require('./extension/manifest.json').version)")
OUT="hindsight-extension-v${VERSION}.zip"

# preflight: everything the extension needs to run
for f in extension/manifest.json extension/background.js extension/mirror-core.js \
         extension/content.js extension/popup.html extension/popup.js \
         extension/window.html extension/window.js \
         extension/fonts/inter.woff2 extension/fonts/grotesk.woff2 \
         extension/icons/icon16.png extension/icons/icon32.png \
         extension/icons/icon48.png extension/icons/icon128.png; do
  [ -f "$f" ] || { echo "MISSING: $f"; exit 1; }
done

rm -f "$OUT"
( cd extension && zip -r -q "../$OUT" . \
    -x "store/*" "README.md" ".DS_Store" "**/.DS_Store" )

echo "Built $OUT  ($(du -h "$OUT" | cut -f1))  — no network permission, nothing recorded"
echo "Upload at: https://chrome.google.com/webstore/devconsole"
