#!/bin/bash
set -e

# ───────────────────────────────────────────────────────────────
#  Sorvx Search  —  Nginx + SSL setup
#  Run once on your VPS to terminate SSL and proxy to :3000
# ───────────────────────────────────────────────────────────────

DOMAIN="search.sorvx.com"
FRONTEND_PORT=3000
NGINX_SSL_DIR="/etc/nginx/ssl"
NGINX_SITES="/etc/nginx/sites-available"
NGINX_ENABLED="/etc/nginx/sites-enabled"

info()  { echo -e "  \e[36m*\e[0m $1"; }
ok()    { echo -e "  \e[32m\u2713\e[0m $1"; }
warn()  { echo -e "  \e[33m!\e[0m $1"; }
err()   { echo -e "  \e[31m\u2717\e[0m $1"; }

if [[ $EUID -ne 0 ]]; then
  err "This script must be run as root (sudo)."
  exit 1
fi

cat << 'EOF'

  ┌─────────────────────────────────────────────┐
  │      Sorvx Search  —  Nginx SSL Setup      │
  │    Domain: search.sorvx.com → :3000         │
  └─────────────────────────────────────────────┘

EOF

# ── Install Nginx ──────────────────────────────────────────────
if ! command -v nginx &>/dev/null; then
  info "Installing Nginx..."
  apt-get update -qq && apt-get install -y -qq nginx
  ok "Nginx installed"
else
  ok "Nginx already installed ($(nginx -v 2>&1 | grep -oP '[\d.]+'))"
fi

# ── Create SSL directory ───────────────────────────────────────
mkdir -p "$NGINX_SSL_DIR"

# ── Generate self-signed key + cert (placeholder) ──────────────
# Replace these with your Cloudflare Origin CA cert + key when ready.
if [[ ! -f "$NGINX_SSL_DIR/$DOMAIN.key" ]]; then
  info "Generating self-signed RSA key and certificate..."
  openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
    -keyout "$NGINX_SSL_DIR/$DOMAIN.key" \
    -out "$NGINX_SSL_DIR/$DOMAIN.crt" \
    -subj "/CN=$DOMAIN" \
    -addext "subjectAltName=DNS:$DOMAIN,DNS:*.$DOMAIN"
  chmod 600 "$NGINX_SSL_DIR/$DOMAIN.key"
  ok "Self-signed certificate generated"
  warn "This is a self-signed cert — replace with Cloudflare Origin CA cert when ready."
  warn "  Cert: $NGINX_SSL_DIR/$DOMAIN.crt"
  warn "  Key:  $NGINX_SSL_DIR/$DOMAIN.key"
else
  ok "SSL key already exists — skipping generation"
fi

# ── Write Nginx config ─────────────────────────────────────────
info "Writing Nginx config..."

cat > "$NGINX_SITES/$DOMAIN.conf" << NGINX
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN;

    ssl_certificate     $NGINX_SSL_DIR/$DOMAIN.crt;
    ssl_certificate_key $NGINX_SSL_DIR/$DOMAIN.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    # Cloudflare (strict mode — cert can be replaced with Origin CA)
    ssl_verify_client off;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;

    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "0";

    # Proxy to Next.js frontend
    location / {
        proxy_pass http://127.0.0.1:$FRONTEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }

    # Optional: expose PHP backend health endpoint internally only
    location /healthz {
        proxy_pass http://127.0.0.1:3000/api/health;
        proxy_set_header Host \$host;
    }

    access_log /var/log/nginx/${DOMAIN}_access.log;
    error_log  /var/log/nginx/${DOMAIN}_error.log;
}
NGINX

# ── Enable site ────────────────────────────────────────────────
ln -sf "$NGINX_SITES/$DOMAIN.conf" "$NGINX_ENABLED/"

# ── Test & reload ──────────────────────────────────────────────
info "Testing Nginx configuration..."
if nginx -t 2>&1; then
  systemctl reload nginx || nginx -s reload
  ok "Nginx reloaded — https://$DOMAIN → http://127.0.0.1:$FRONTEND_PORT"
else
  err "Nginx config test failed. Run: nginx -t"
  exit 1
fi

echo ""
echo "  ─────────────────────────────────────────────"
echo -e "  \e[36mhttps://$DOMAIN\e[0m   →   \e[35mhttp://127.0.0.1:$FRONTEND_PORT\e[0m"
echo "  ─────────────────────────────────────────────"
echo ""
echo "  Make sure your DNS A record for search.sorvx.com points to this server's IP."
echo "  Cloudflare SSL/TLS setting should be: Full (strict)"
