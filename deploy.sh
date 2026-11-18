#!/usr/bin/env bash
# Runs ON THE VPS: builds the site and publishes it into the folder Caddy
# serves (ClearNest's docker-compose bind-mounts it as /srv/landing, so no
# container restart is needed). The CI deploy job calls this over SSH after
# resetting the checkout to origin/main; it can also be run by hand.
set -euo pipefail
cd "$(dirname "$0")"

LIVE="${LIVE_DIR:-$HOME/Grihive/ClearNest/landing}"
[ -d "$LIVE" ] || { echo "deploy: $LIVE does not exist" >&2; exit 1; }

# `ci`, not `install`: install rewrites package-lock.json, and a dirty
# lockfile on the server is what breaks the next pull.
npm --prefix react ci --no-audit --no-fund
npm --prefix react run build
# never wipe the live site for a build that produced nothing
[ -f react/dist/index.html ] || { echo "deploy: build produced no index.html" >&2; exit 1; }

# ClearNest tracks .gitignore and README.md in that folder; keep them.
find "$LIVE" -mindepth 1 ! -name .gitignore ! -name README.md -delete
cp -r react/dist/. "$LIVE"/
# SELinux labels, so Caddy's container may read the new files
if command -v restorecon >/dev/null; then restorecon -R "$LIVE"; fi

echo "deploy: published $(git rev-parse --short HEAD) to $LIVE"
