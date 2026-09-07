#!/usr/bin/env bash
set -euo pipefail

# Run from the checkout for the same commit that produced COMPOSEERR_IMAGE.
if [[ ! ${COMPOSEERR_IMAGE:-} =~ ^ghcr\.io/m0nte1ro/composeerr@sha256:[a-f0-9]{64}$ ]]; then
  echo 'COMPOSEERR_IMAGE must identify the published production image by digest.' >&2
  exit 1
fi

deploy_dir=${COMPOSEERR_DEPLOY_DIR:-/opt/composeerr}
test -d "$deploy_dir"
test -w "$deploy_dir"
source_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)

# Pull before changing the running installation or its configuration.
docker pull "$COMPOSEERR_IMAGE"
install -m 644 "$source_dir/compose.prod.yaml" "$deploy_dir/compose.prod.yaml"
cd "$deploy_dir"
touch .env
printf 'COMPOSEERR_IMAGE=%s\n' "$COMPOSEERR_IMAGE" > .deploy-image.env
compose=(docker compose --project-name composeerr --env-file .env --env-file .deploy-image.env -f compose.prod.yaml)
"${compose[@]}" config --quiet
"${compose[@]}" up -d --no-build --wait --wait-timeout 180
"${compose[@]}" ps
# Check inside the container so a custom published port requires no script changes.
"${compose[@]}" exec -T composeerr node -e "fetch('http://127.0.0.1:3000/api/health', {signal: AbortSignal.timeout(4000)}).then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
