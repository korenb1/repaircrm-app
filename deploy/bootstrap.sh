#!/usr/bin/env bash
# One-time VPS provisioning. Run as root on a fresh Ubuntu 24.04 box:
#
#   REPO=git@github.com:you/repaircrm-app.git bash deploy/bootstrap.sh
#
# Installs docker + node + caddy, creates the deploy user, lays out
# /srv/repaircrm, clones the repo twice. Does NOT write secrets — after this,
# fill in the four env files and run deploy.sh (see deploy/README.md).
set -euo pipefail

REPO="https://github.com/korenb1/repaircrm-app.git"

log() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }

log "packages"
apt-get update
apt-get install -y ca-certificates curl git ufw fail2ban postgresql-client \
  unattended-upgrades debian-keyring debian-archive-keyring apt-transport-https

log "docker"
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi

log "node 22"
if ! command -v node >/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

log "caddy"
if ! command -v caddy >/dev/null; then
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/gpg.key \
    | gpg --dearmor -o /usr/share/keyrings/caddy.gpg
  echo "deb [signed-by=/usr/share/keyrings/caddy.gpg] https://dl.cloudsmith.io/public/caddy/stable/deb/debian any-version main" \
    > /etc/apt/sources.list.d/caddy.list
  apt-get update && apt-get install -y caddy
fi

log "swap (next build spikes memory)"
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

log "firewall"
# Postgres stays on loopback — deliberately not opened here.
ufw allow 22/tcp
ufw allow 80,443/tcp
ufw --force enable

log "deploy user"
id -u deploy >/dev/null 2>&1 || useradd -m -s /bin/bash deploy
usermod -aG docker deploy
# Let deploy restart only its own units, no password.
cat > /etc/sudoers.d/repaircrm <<'EOF'
deploy ALL=(root) NOPASSWD: /bin/systemctl restart repaircrm@prod, /bin/systemctl restart repaircrm@staging, /usr/bin/systemctl restart repaircrm@prod, /usr/bin/systemctl restart repaircrm@staging
EOF
chmod 440 /etc/sudoers.d/repaircrm

log "layout"
mkdir -p /srv/repaircrm/landing /var/backups/repaircrm
for env in prod staging; do
  mkdir -p "/srv/repaircrm/$env"
done
chown -R deploy:deploy /srv/repaircrm
for env in prod staging; do
  if [ ! -d "/srv/repaircrm/$env/app/.git" ]; then
    sudo -u deploy git clone "$REPO" "/srv/repaircrm/$env/app"
  fi
  mkdir -p "/srv/repaircrm/$env/supabase"
  cp -r "/srv/repaircrm/$env/app/deploy/supabase/." "/srv/repaircrm/$env/supabase/"
  rm -f "/srv/repaircrm/$env/supabase/.env.example.applied"
done
chown -R deploy:deploy /srv/repaircrm

log "systemd units"
# The autodeploy timer is installed but not enabled — it would fire before the
# env files exist. Enable it at step 6, after the first manual deploy is green.
cp /srv/repaircrm/prod/app/deploy/systemd/repaircrm@.service \
   /srv/repaircrm/prod/app/deploy/systemd/repaircrm-autodeploy@.service \
   /srv/repaircrm/prod/app/deploy/systemd/repaircrm-autodeploy@.timer \
   /etc/systemd/system/
systemctl daemon-reload

log "nightly backups"
cp /srv/repaircrm/prod/app/deploy/backup.sh /usr/local/bin/repaircrm-backup
chmod +x /usr/local/bin/repaircrm-backup
echo '0 3 * * * root /usr/local/bin/repaircrm-backup >> /var/log/repaircrm-backup.log 2>&1' \
  > /etc/cron.d/repaircrm-backup

cat <<'EOF'

Bootstrap done. Next, by hand:

  1. cp /srv/repaircrm/prod/supabase/.env.example /srv/repaircrm/prod/supabase/.env
     (same for staging) and fill in — different secrets per env.
     Keys:  node /srv/repaircrm/prod/app/deploy/supabase/gen-keys.mjs "$JWT_SECRET"
  2. cd /srv/repaircrm/<env>/supabase && docker compose up -d
  3. cp .../app/deploy/env/app.env.example /srv/repaircrm/<env>/app/.env.production
     fill in, chmod 600
  4. cp .../app/deploy/Caddyfile /etc/caddy/Caddyfile, replace domain.com,
     systemctl reload caddy
  5. sudo -u deploy /srv/repaircrm/staging/app/deploy/deploy.sh staging
     sudo -u deploy /srv/repaircrm/prod/app/deploy/deploy.sh prod
  6. systemctl enable --now repaircrm@prod repaircrm@staging
     systemctl enable --now repaircrm-autodeploy@staging.timer   # develop -> staging
  7. create the first admin (see deploy/README.md)
EOF
