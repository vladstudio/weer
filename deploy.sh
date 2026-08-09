#!/usr/bin/env bash
# /srv/weer/current is served by Caddy (see /etc/caddy/Caddyfile).
set -euo pipefail
cd "$(dirname "$0")"
export SITE=weer
export TYPE=static
export BUILD="bun run build"
export BUILD_DIR=dist
exec ../_deploy/deploy.sh