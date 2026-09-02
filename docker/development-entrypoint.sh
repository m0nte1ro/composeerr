#!/bin/sh

set -eu

lockfile_marker="/app/node_modules/.composeerr-package-lock.sha256"
lockfile_hash="$(sha256sum /app/package-lock.json)"
lockfile_hash="${lockfile_hash%% *}"
installed_hash=""

if [ -f "$lockfile_marker" ]; then
  IFS= read -r installed_hash < "$lockfile_marker" || true
fi

if [ ! -x /app/node_modules/.bin/next ] || [ "$installed_hash" != "$lockfile_hash" ]; then
  echo "Installing development dependencies from package-lock.json..."
  npm ci
  printf '%s\n' "$lockfile_hash" > "$lockfile_marker"
fi

exec "$@"
