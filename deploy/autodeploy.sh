#!/usr/bin/env bash
# Poll origin and run deploy.sh when the tracked branch moves.
#
#   ./autodeploy.sh staging            # no-op unless origin/develop moved
#   ./autodeploy.sh staging --force    # deploy regardless, still takes the lock
#
# Driven by repaircrm-autodeploy@<env>.timer. Run as the deploy user.
#
# The repo is public, so the poll is an unauthenticated `git ls-remote` — no
# deploy key, no GitHub secret, nothing listening on the box.
set -euo pipefail

ENV="${1:-}"
FORCE="${2:-}"
case "$ENV" in
  prod)    BRANCH="${BRANCH:-main}" ;;
  staging) BRANCH="${BRANCH:-develop}" ;;
  *) echo "usage: $0 prod|staging [--force]" >&2; exit 1 ;;
esac

ROOT="/srv/repaircrm/$ENV"
APP="$ROOT/app"
LOCK="/run/lock/repaircrm-deploy-$ENV.lock"
OK="$ROOT/.last-deployed"   # sha of the last green deploy
BAD="$ROOT/.last-failed"    # sha of the last red one — deliberately not retried

log() { printf '\033[1;35m::: %s\033[0m\n' "$*"; }

# Re-exec under an exclusive lock. npm ci + next build runs for minutes, well
# past the next timer tick, so overlap is the normal case, not the edge case.
# -E 99 distinguishes "someone else is deploying" from a real failure.
if [ "${_RC_LOCKED:-}" != 1 ]; then
  export _RC_LOCKED=1
  set +e
  flock -n -E 99 "$LOCK" "$0" "$@"
  rc=$?
  set -e
  if [ "$rc" = 99 ]; then
    log "$ENV: a deploy already holds $LOCK — skipping this tick"
    exit 0
  fi
  exit "$rc"
fi

cd "$APP"

remote=$(git ls-remote origin "refs/heads/$BRANCH" 2>/dev/null | cut -f1) || true
if [ -z "$remote" ]; then
  echo "cannot resolve origin/$BRANCH — network down or remote misconfigured" >&2
  exit 1
fi

if [ "$FORCE" != "--force" ]; then
  if [ "$remote" = "$(cat "$OK" 2>/dev/null || true)" ]; then
    exit 0
  fi
  # A commit that already failed to build will fail again every 60s. Wait for
  # a new one instead; `rm .last-failed` to retry by hand.
  if [ "$remote" = "$(cat "$BAD" 2>/dev/null || true)" ]; then
    log "$ENV: ${remote:0:8} already failed — waiting for a new commit on $BRANCH"
    exit 0
  fi
fi

log "$ENV: origin/$BRANCH moved to ${remote:0:8} — deploying"

set +e
"$APP/deploy/deploy.sh" "$ENV"
rc=$?
set -e

if [ "$rc" = 0 ]; then
  printf '%s\n' "$remote" > "$OK"
  rm -f "$BAD"
  log "$ENV: ${remote:0:8} deployed"
else
  printf '%s\n' "$remote" > "$BAD"
  echo "$ENV: deploy of ${remote:0:8} FAILED (exit $rc). Not retrying until a" \
       "new commit lands on $BRANCH — or you rm $BAD." >&2
  exit "$rc"
fi
