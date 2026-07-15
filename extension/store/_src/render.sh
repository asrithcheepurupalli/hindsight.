#!/usr/bin/env bash
# Render the Chrome Web Store assets from the HTML templates in this dir.
# Works with any Chrome/Chromium binary; set CHROME to override.
# (airlock house pattern, made Linux/mac agnostic)
set -euo pipefail
cd "$(dirname "$0")"

CHROME="${CHROME:-$(command -v chromium || command -v google-chrome || echo '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')}"

render() { # html w h out
  local html="$1" w="$2" h="$3" out="$4"
  "$CHROME" --headless=new --hide-scrollbars --disable-gpu \
    --window-size="$w,$h" \
    --screenshot="../$out" "file://$PWD/$html" >/dev/null 2>&1
  echo "rendered ../$out (${w}x${h})"
}

render shot-1.html 1280 800 screenshot-1-1280x800.png
render shot-2.html 1280 800 screenshot-2-1280x800.png
render shot-3.html 1280 800 screenshot-3-1280x800.png
render tile.html    440 280 promo-tile-440x280.png
echo "done."
