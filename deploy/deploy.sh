#!/usr/bin/env bash
# Deploy one environment: pull, migrate, build, restart.
#
#   ./deploy.sh staging
#   ./deploy.sh prod
#
# Run as the deploy user. Idempotent — safe to re-run.
set -euo pipefail

ENV="${1:-}"
case "$ENV" in
  prod)    BRANCH="${BRANCH:-main}" ;;
  staging) BRANCH="${BRANCH:-develop}" ;;
  *) echo "usage: $0 prod|staging   (optional: BRANCH=xyz $0 staging)" >&2; exit 1 ;;
esac

ROOT="/srv/repaircrm/$ENV"
APP="$ROOT/app"
SVC="repaircrm@$ENV"

log() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }

cd "$APP"

log "$ENV: fetching $BRANCH"
git fetch --prune origin "$BRANCH"
git reset --hard "origin/$BRANCH"
git rev-parse --short HEAD

log "$ENV: loading env"
set -a
# shellcheck disable=SC1091
. "$APP/.env.production"
set +a
: "${DATABASE_URL:?missing in .env.production}"
: "${NEXT_PUBLIC_SUPABASE_URL:?missing in .env.production}"

log "$ENV: installing deps"
# --include=dev: the build needs typescript / eslint / the supabase CLI.
NODE_ENV=development npm ci --include=dev

log "$ENV: waiting for postgres"
for i in $(seq 1 30); do
  if pg_isready -d "$DATABASE_URL" >/dev/null 2>&1; then break; fi
  [ "$i" = 30 ] && { echo "postgres unreachable at DATABASE_URL" >&2; exit 1; }
  sleep 2
done

log "$ENV: applying migrations"
npx supabase db push --db-url "$DATABASE_URL" --include-all --yes

log "$ENV: restarting PostgREST (schema cache reload)"
cd "$ROOT/supabase"
docker compose restart rest
sleep 3
cd "$APP"

log "$ENV: building"
npm run build

# `output: 'standalone'` emits a self-contained server.js but does not copy the
# static assets or /public — Next expects the deployer to do it.
log "$ENV: assembling standalone bundle"
rm -rf .next/standalone/.next/static .next/standalone/public
cp -r .next/static .next/standalone/.next/static
[ -d public ] && cp -r public .next/standalone/public

log "$ENV: restarting $SVC"
sudo systemctl restart "$SVC"
sleep 2
systemctl is-active --quiet "$SVC" && echo "$SVC is running" || {
  journalctl -u "$SVC" -n 40 --no-pager >&2
  exit 1
}

log "$ENV: smoke test"
curl -fsS -o /dev/null -w 'app  HTTP %{http_code}\n' "http://127.0.0.1:${PORT:-3000}/login"
curl -fsS -o /dev/null -w 'rest HTTP %{http_code}\n' \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/"

log "$ENV: done"
