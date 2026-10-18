#!/bin/sh
# Copy the static site without development files. No compilation or dependencies.
set -eu
cd "$(dirname "$0")/.."
destination=${1:-_site}
if [ -e "$destination" ]; then
  echo "Destination already exists: $destination" >&2
  exit 1
fi
mkdir -p "$destination/assets"
cp index.html favicon.svg .nojekyll LICENSE capabilities.json "$destination/"
cp -R src docs examples "$destination/"
cp -R assets/reactor "$destination/assets/"
