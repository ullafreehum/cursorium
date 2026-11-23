#!/usr/bin/env bash
# Rebuild themes/ and catalog.json from the original open-source cursor projects.
# Needs: python3, pip install "scrapling[fetchers]==0.5.1" pillow, unzip, tar.
# Run from the repo root:  bash scripts/build_themes.sh
set -euo pipefail
python3 scripts/fetch_release_assets.py raw          # ~76 downloads, 10 s apart (≈13 min)
mkdir -p ex
for d in raw/*/; do
  n=$(basename "$d"); mkdir -p "ex/$n"
  for f in "$d"*; do
    case "$f" in *.json) ;; *.zip) unzip -qn "$f" -d "ex/$n" ;; *) tar -xkf "$f" -C "ex/$n" 2>/dev/null || true ;; esac
  done
done
python3 scripts/build_catalog.py
python3 scripts/convert.py scripts/catalog_in2.json
echo "Done: themes/ and catalog.json rebuilt."
