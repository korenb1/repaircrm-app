# VPS deployment — landing + prod + staging on one box

| Host | Serves | Local port |
|---|---|---|
| `domain.com`, `www.domain.com` | static landing (`/srv/repaircrm/landing`) | — |
| `app.domain.com` | prod Next app | 3000 |
| `db.domain.com` | prod PostgREST + storage | 5401 / 5402 |
| `testapp.domain.com` | staging Next app | 3001 |
| `db-staging.domain.com` | staging PostgREST + storage | 5411 / 5412 |

Postgres: prod `127.0.0.1:5432`, staging `127.0.0.1:5433`. Loopback only.

`NEXT_PUBLIC_SUPABASE_URL` is inlined into the browser bundle at build time, so
the Supabase API needs a real public hostname per environment — hence the two
`db*` subdomains. It also means prod and staging are **separate builds**; you
cannot promote one artifact by swapping the env file.

## Box

4 vCPU / 8 GB / 80 GB SSD, Ubuntu 24.04. Two Supabase stacks ≈ 2 GB idle;
`next build` is the memory peak, which is what the 2 GB swap in `bootstrap.sh`
covers. 16 GB if you want headroom for concurrent builds.

## Files here

```
deploy/
  bootstrap.sh              one-time VPS provisioning (run as root)
  deploy.sh                 pull + migrate + build + restart, per env
  autodeploy.sh             poll origin, call deploy.sh when the branch moves
  backup.sh                 nightly pg_dump + storage tarball, 14-day retention
  Caddyfile                 all five vhosts, automatic TLS
  systemd/
    repaircrm@.service            templated: repaircrm@prod, repaircrm@staging
    repaircrm-autodeploy@.service one auto-deploy check
    repaircrm-autodeploy@.timer   runs the check every 60s
  env/app.env.example       -> /srv/repaircrm/<env>/app/.env.production
  supabase/
    docker-compose.yml      db + rest + storage + imgproxy (no GoTrue/kong/studio)
    .env.example            -> /srv/repaircrm/<env>/supabase/.env
    init/99-passwords.sql   first-boot role passwords + auth.uid()
    gen-keys.mjs            mints ANON_KEY / SERVICE_ROLE_KEY from JWT_SECRET
```

## Why the Supabase stack is trimmed

Identity is Better Auth, not GoTrue — `src/lib/supabase/jwt.ts` signs an HS256
token with `SUPABASE_JWT_SECRET`, and PostgREST/storage-api accept any token
signed with the matching secret. So GoTrue is dropped. Realtime is unused. Kong
is replaced by Caddy `handle_path` rules. Studio is dropped in favour of an SSH
tunnel. What remains: Postgres, PostgREST, storage-api, imgproxy.

## DNS

Five A records → VPS IP: `@`, `www`, `app`, `db`, `testapp`, `db-staging`.
Let them propagate *before* reloading Caddy, or ACME issuance fails.

## First install

1. **Provision**

   ```bash
   ssh root@vps
   REPO=git@github.com:korenb1/repaircrm-app.git bash <(curl -fsSL https://raw.githubusercontent.com/korenb1/repaircrm-app/main/deploy/bootstrap.sh)
   ```

   Or clone first and `bash deploy/bootstrap.sh`. Private repo → put a deploy
   key on the box first.

2. **Supabase env, per environment**

   ```bash
   cd /srv/repaircrm/prod/supabase
   cp .env.example .env
   openssl rand -hex 24   # -> POSTGRES_PASSWORD
   openssl rand -hex 32   # -> JWT_SECRET
   node /srv/repaircrm/prod/app/deploy/supabase/gen-keys.mjs "<JWT_SECRET>"
   ```

   Paste the two printed keys into `.env`. Repeat for staging with
   `STACK_NAME=rcrm-stg`, ports `5433/5411/5412`, and **fresh secrets**.

3. **Start the stacks**

   ```bash
   cd /srv/repaircrm/prod/supabase    && docker compose up -d
   cd /srv/repaircrm/staging/supabase && docker compose up -d
   ```

4. **App env, per environment** — copy `deploy/env/app.env.example` to
   `/srv/repaircrm/<env>/app/.env.production`, fill in, then:
   sudo chown deploy:deploy /srv/repaircrm/<env>/app/.env.production
   sudo chmod 600 /srv/repaircrm/<env>/app/.env.production
   `SUPABASE_JWT_SECRET` must be byte-identical to that stack's `JWT_SECRET`.

5. **Caddy**

   ```bash
   cp /srv/repaircrm/prod/app/deploy/Caddyfile /etc/caddy/Caddyfile
   sed -i 's/domain\.com/yourdomain.com/g' /etc/caddy/Caddyfile
   systemctl reload caddy
   ```

6. **Deploy**

   ```bash
   sudo -u deploy /srv/repaircrm/staging/app/deploy/deploy.sh staging
   sudo -u deploy /srv/repaircrm/prod/app/deploy/deploy.sh prod
   systemctl enable --now repaircrm@prod repaircrm@staging
   systemctl enable --now repaircrm-autodeploy@staging.timer
   ```

   Enable the timer *after* that first manual deploy is green — see
   "Auto-deploy" below.

7. **First admin**, per environment. `create-admin.ts` only auto-loads
   `.env.local`, but its loader skips vars already in the process env, so
   sourcing the production file works:

   ```bash
   cd /srv/repaircrm/prod/app
   set -a; . .env.production; set +a
   npx tsx scripts/create-admin.ts
   ```

   Log in, change the password.

## Routine deploys

`main` → prod, `develop` → staging. Merge to `main` only after staging is green.

Staging deploys itself; prod is manual:

```bash
sudo -u deploy /srv/repaircrm/prod/app/deploy/deploy.sh prod
```

`deploy.sh` runs `supabase db push` before building, so migrations land first.
Migrations are forward-only — a deploy that needs a rollback needs a new
migration, or a restore from `/var/backups/repaircrm`.

## Auto-deploy (staging)

`repaircrm-autodeploy@staging.timer` runs `autodeploy.sh staging` every 60s. It
does an unauthenticated `git ls-remote origin refs/heads/develop`, compares the
sha to `/srv/repaircrm/staging/.last-deployed`, and calls `deploy.sh staging`
when they differ. So: push to `develop`, staging is live within a minute plus
the build.

Nothing is exposed for this — no webhook listener, no port, no deploy key, no
GitHub secret. It works because the repo is public. If you ever make it
private, put a read-only deploy key on the box and switch `origin` to SSH; the
timer itself doesn't change.

Enable it, per environment:

```bash
sudo systemctl enable --now repaircrm-autodeploy@staging.timer
systemctl list-timers 'repaircrm-*'
journalctl -u 'repaircrm-autodeploy@staging' -f
```

**Prod is intentionally not enabled.** `repaircrm-autodeploy@prod.timer` exists
and works, but auto-deploying prod means a push to `main` mutates the
production database via `supabase db push` with nobody watching. Enable it only
if you want that.

### Behaviour worth knowing

- **Overlap.** `autodeploy.sh` re-execs itself under
  `flock /run/lock/repaircrm-deploy-<env>.lock`. A build that outlives the next
  tick just makes the tick a no-op. Run manual deploys as
  `autodeploy.sh staging --force` to take the same lock; calling `deploy.sh`
  directly bypasses it and can race the timer.
- **Failures don't loop.** A red deploy writes the sha to
  `/srv/repaircrm/staging/.last-failed` and is not retried — otherwise a broken
  commit rebuilds every 60s forever. The next commit on `develop` clears it. To
  retry the same sha by hand:

  ```bash
  sudo -u deploy rm /srv/repaircrm/staging/.last-failed
  ```

- **Failures are silent apart from the journal.** There's no alerting.
  `systemctl status repaircrm-autodeploy@staging.service` shows the last run;
  `journalctl -u repaircrm-autodeploy@staging --since -1h` shows why.
- **Pause it** during maintenance with
  `sudo systemctl stop repaircrm-autodeploy@staging.timer`.

## Operating

```bash
journalctl -u repaircrm@prod -f            # app logs
docker compose -f /srv/repaircrm/prod/supabase/docker-compose.yml logs -f
systemctl restart repaircrm@staging
```

DB shell (no Studio exposed):

```bash
# from your laptop
ssh -L 5432:127.0.0.1:5432 deploy@vps
psql postgresql://postgres:<pw>@127.0.0.1:5432/postgres
```

Optional: server-side Supabase calls use the same public
`NEXT_PUBLIC_SUPABASE_URL`, so they hairpin out to Caddy and back. To keep that
traffic on the box, add to `/etc/hosts`:

```
127.0.0.1 db.domain.com db-staging.domain.com
```

Caddy still terminates TLS locally with a valid cert, so nothing else changes.

## Security notes

- Prod and staging share nothing: separate `STACK_NAME` → separate docker
  volumes, separate Postgres, separate `JWT_SECRET` and `BETTER_AUTH_SECRET`.
  Reusing a JWT secret across environments means a staging token is accepted by
  prod.
- Postgres ports are bound to `127.0.0.1` and `ufw` never opens them. Reach the
  DB over SSH.
- `.env.production` and `supabase/.env` hold service-role keys, which bypass
  RLS entirely. `chmod 600`, owner `deploy`, never committed.
- `SERVICE_ROLE_KEY` and `ANON_KEY` from `gen-keys.mjs` are 10-year JWTs. To
  rotate, change `JWT_SECRET`, regenerate both keys, update the app env, and
  restart both the stack and the app — every existing session is invalidated.
- Staging is `noindex` by default; uncomment the `basic_auth` block in the
  Caddyfile if it should not be publicly reachable at all.
- Backups live on the same disk until you enable the remote copy at the bottom
  of `backup.sh`. Do that before treating them as backups.
