#!/usr/bin/env bash
# Build weer and deploy to weer.vlad.studio.
# Server layout: /srv/weer is served by Caddy (see /etc/caddy/Caddyfile).
set -euo pipefail
cd "$(dirname "$0")"

echo "▸ build"
bun run build

echo "▸ deploy"
rsync -avz --delete --human-readable dist/ vlad@77.42.92.64:/srv/weer/

echo "✓ https://weer.vlad.studio"