#!/usr/bin/env bash
# Optimize the nginx site config for wiki.at.online (AltWiki).
#
# Adds: gzip for proxied responses, 1-year immutable cache for hashed /assets/,
# 1-week cache for /fonts /backgrounds /icons, and a 200M upload limit.
# Keeps a timestamped backup, validates with `nginx -t`, and restores the
# backup automatically if validation or reload fails.
#
# Usage: sudo bash scripts/optimize-nginx-wiki.sh

set -euo pipefail

SITE=/etc/nginx/sites-available/wiki
GZIP_INCLUDE=/etc/nginx/includes/common-gzip.conf
UPSTREAM=http://127.0.0.1:3001
DOMAIN=wiki.at.online

[ "$(id -u)" -eq 0 ] || { echo "Run as root: sudo bash $0" >&2; exit 1; }
[ -f "$SITE" ] || { echo "Missing $SITE" >&2; exit 1; }

if grep -q "performance (AltWiki optimize)" "$SITE"; then
  echo "Already optimized: $SITE (nothing to do)"
  exit 0
fi

# Shared gzip settings (create only if absent).
if [ ! -f "$GZIP_INCLUDE" ]; then
  mkdir -p "$(dirname "$GZIP_INCLUDE")"
  cat > "$GZIP_INCLUDE" <<'EOF'
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_types text/plain text/css text/xml text/csv application/json application/javascript application/xml image/svg+xml;
gzip_min_length 1000;
EOF
  echo "Created $GZIP_INCLUDE"
fi

BACKUP="$SITE.bak-$(date +%Y%m%d-%H%M%S)"
cp -a "$SITE" "$BACKUP"
echo "Backup: $BACKUP"

read -r -d '' PERF_BLOCK <<EOF || true
    # --- performance (AltWiki optimize) ---
    include $GZIP_INCLUDE;
    client_max_body_size 200M;

    # Vite build output is content-hashed: cache for a year.
    location /assets/ {
        proxy_pass $UPSTREAM;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_hide_header Cache-Control;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Fonts, backgrounds, icons change rarely: cache for a week.
    location ~ ^/(fonts|backgrounds|icons)/ {
        proxy_pass $UPSTREAM;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_hide_header Cache-Control;
        add_header Cache-Control "public, max-age=604800";
    }
EOF

# Insert the block after every "server_name wiki.at.online;" line (80 and 443).
TMP=$(mktemp)
awk -v block="$PERF_BLOCK" -v dom="$DOMAIN" '
  { print }
  $1 == "server_name" && index($0, dom ";") { print block }
' "$SITE" > "$TMP"

if [ "$(grep -c 'performance (AltWiki optimize)' "$TMP")" -lt 1 ]; then
  rm -f "$TMP"; echo "server_name $DOMAIN not found; no change made" >&2; exit 1
fi

cat "$TMP" > "$SITE"; rm -f "$TMP"

restore() {
  echo "Restoring backup..." >&2
  cp -a "$BACKUP" "$SITE"
  nginx -t >/dev/null 2>&1 && systemctl reload nginx || true
  exit 1
}

nginx -t || restore
systemctl reload nginx || restore
echo "nginx reloaded."

# Verify (non-fatal).
sleep 1
ASSET=$(curl -sk "https://$DOMAIN/" | grep -o '/assets/index-[^"]*\.js' | head -1 || true)
if [ -n "$ASSET" ]; then
  echo "--- verify $ASSET"
  curl -sk -o /dev/null -D - -H 'Accept-Encoding: gzip' "https://$DOMAIN$ASSET" \
    | grep -iE '^(content-encoding|cache-control)' || echo "(headers not found)"
  printf 'download size (gzip): '
  curl -sk -o /dev/null -w '%{size_download} bytes\n' -H 'Accept-Encoding: gzip' "https://$DOMAIN$ASSET"
fi
echo "Done. Rollback: sudo cp -a $BACKUP $SITE && sudo nginx -t && sudo systemctl reload nginx"
