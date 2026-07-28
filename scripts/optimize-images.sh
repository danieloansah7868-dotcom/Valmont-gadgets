#!/usr/bin/env bash
# Converts every large PNG in uploads/ to responsive WebP derivatives.
# Requires: ImageMagick (convert) or libwebp (cwebp).
set -euo pipefail
cd "$(dirname "$0")/.."

WIDTHS=(400 800)
QUALITY=82

for src in uploads/*.png; do
  base="${src%.png}"
  # Full-size WebP (used as the <img src> fallback target / OG image)
  if command -v cwebp >/dev/null 2>&1; then
    cwebp -q "$QUALITY" -m 6 -mt "$src" -o "${base}.webp"
  else
    convert "$src" -strip -quality "$QUALITY" -define webp:method=6 "${base}.webp"
  fi

  # Responsive derivatives for srcset
  for w in "${WIDTHS[@]}"; do
    if command -v cwebp >/dev/null 2>&1; then
      cwebp -q "$QUALITY" -m 6 -mt -resize "$w" 0 "$src" -o "${base}_${w}.webp"
    else
      convert "$src" -strip -resize "${w}x>" -quality "$QUALITY" \
        -define webp:method=6 "${base}_${w}.webp"
    fi
  done

  # Shrink the PNG fallback itself (lossless re-encode, max 800px wide)
  convert "$src" -strip -resize '600x600>' -colors 256 -define png:compression-level=9 "$src"
done

echo "Done. Results:"
ls -la uploads/
