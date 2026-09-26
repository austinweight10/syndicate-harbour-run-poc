#!/usr/bin/env bash
# First deploy of Syndicate to Fly.io. Run from repo root after: fly auth login
set -euo pipefail
export PATH="${HOME}/.fly/bin:${PATH}"

APP="${FLY_APP:-syndicate-harbour-run}"
REGION="${FLY_REGION:-lhr}"

if ! fly auth whoami >/dev/null 2>&1; then
  echo "Not logged in. Run: fly auth login"
  echo "Or: export FLY_API_TOKEN=\$(fly tokens create deploy)"
  exit 1
fi

if ! fly apps list -q 2>/dev/null | grep -qx "$APP"; then
  echo "Creating app ${APP}..."
  fly apps create "$APP" --org personal 2>/dev/null || fly apps create "$APP"
fi

if ! fly volumes list -a "$APP" 2>/dev/null | grep -q syndicate_data; then
  echo "Creating volume syndicate_data in ${REGION}..."
  fly volumes create syndicate_data --region "$REGION" --size 1 -a "$APP" -y
fi

URL="https://${APP}.fly.dev"
echo "Setting SHOPIFY_APP_URL=$URL"
fly secrets set "SHOPIFY_APP_URL=$URL" -a "$APP"

echo "Deploying..."
fly deploy -a "$APP"

echo ""
echo "Live: $URL/app"
echo "Logs: fly logs -a $APP"
echo "Note: Playwright agents need Chromium -- not installed on this image. Admin + pipeline:demo work."
