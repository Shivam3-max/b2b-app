#!/bin/sh
# Builds every app icon from one square logo (PNG or JPG, 1024 px or larger), using macOS sips only.
#   iOS icon 1024 (logo at 82%, white, no transparency) · Android adaptive foreground (logo in the 66% safe zone)
#   splash logo · web favicon
# Usage: sh scripts/make-icons.sh path/to/logo.png
set -e
SRC="$1"; [ -f "$SRC" ] || { echo "Give the logo file: sh scripts/make-icons.sh logo.png"; exit 1; }
OUT="$(cd "$(dirname "$0")/.." && pwd)/assets"
TMP="$(mktemp -d)"
# Flatten onto white (drops transparency, which the App Store rejects) and square it.
sips -s format jpeg -s formatOptions best "$SRC" --out "$TMP/flat.jpg" >/dev/null
W=$(sips -g pixelWidth "$TMP/flat.jpg" | awk '/pixelWidth/{print $2}'); H=$(sips -g pixelHeight "$TMP/flat.jpg" | awk '/pixelHeight/{print $2}')
S=$(( W > H ? W : H ))
sips -p "$S" "$S" --padColor FFFFFF "$TMP/flat.jpg" --out "$TMP/square.jpg" >/dev/null
fit () { # $1 canvas px, $2 logo px, $3 output png
  sips -Z "$2" "$TMP/square.jpg" --out "$TMP/l.jpg" >/dev/null
  sips -p "$1" "$1" --padColor FFFFFF "$TMP/l.jpg" --out "$TMP/c.jpg" >/dev/null
  sips -s format png "$TMP/c.jpg" --out "$3" >/dev/null
}
fit 1024 840 "$OUT/icon.png"                       # iOS + store listing
fit 1024 660 "$OUT/android-icon-foreground.png"    # Android adaptive (safe zone)
sips -s format png -z 1024 1024 "$TMP/square.jpg" --out "$TMP/bg.png" >/dev/null
fit 1024 1 "$OUT/android-icon-background.png"      # plain white

fit 1024 900 "$OUT/splash-icon.png"
fit 196 180 "$OUT/favicon.png"
rm -rf "$TMP"
echo "Icons written to $OUT"
