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

# ── Write certificate ──────────────────────────────────────────
info "Writing SSL certificate..."
cat > "$NGINX_SSL_DIR/$DOMAIN.crt" << 'CERT'
-----BEGIN CERTIFICATE-----
MIIEnjCCA4agAwIBAgIUYo3VAYJ8mx7R30QCs/jPfbDJuCIwDQYJKoZIhvcNAQEL
BQAwgYsxCzAJBgNVBAYTAlVTMRkwFwYDVQQKExBDbG91ZEZsYXJlLCBJbmMuMTQw
MgYDVQQLEytDbG91ZEZsYXJlIE9yaWdpbiBTU0wgQ2VydGlmaWNhdGUgQXV0aG9y
aXR5MRYwFAYDVQQHEw1TYW4gRnJhbmNpc2NvMRMwEQYDVQQIEwpDYWxpZm9ybmlh
MB4XDTI2MDUyNjE4MTQwMFoXDTQxMDUyMjE4MTQwMFowYjEZMBcGA1UEChMQQ2xv
dWRGbGFyZSwgSW5jLjEdMBsGA1UECxMUQ2xvdWRGbGFyZSBPcmlnaW4gQ0ExJjAk
BgNVBAMTHUNsb3VkRmxhcmUgT3JpZ2luIENlcnRpZmljYXRlMIIBIjANBgkqhkiG
9w0BAQEFAAOCAQ8AMIIBCgKCAQEA8B4oifwooHHlzuuUwoC6Luroa7vf64kDg+/c
ule3Y1KHHIrc58rMcm7zx4y4pcbAAEpn21N4OTs5JBrGiP2ZaGnELFPZ2eSt6TQt
gl22A1NA5JzyCgxll1cHBkJ3f+R6yyqI108bhQiD53vXr5BWf74suK5zT0xKYls2
A3rj0Mh5dNGTvWQp9y5/ISOhQ5X+Otn/C2K52gzuYW4Hv52ZA6FRri2wUQqwUB7x
/rYkbbmgazM7No+X10oZzNjvK6S4FFTqrNz0tGvdRtNC+TGDr0moqQneYGiRvnP3
LjvwkAWcZucH1HF98HuUBmB+qAom5WeLrqI1H29Vz78EbsAPYwIDAQABo4IBIDCC
ARwwDgYDVR0PAQH/BAQDAgWgMB0GA1UdJQQWMBQGCCsGAQUFBwMCBggrBgEFBQcD
ATAMBgNVHRMBAf8EAjAAMB0GA1UdDgQWBBQrbyw/IRRoAtmoU+9y6hZsV10sQjAf
BgNVHSMEGDAWgBQk6FNXXXw0QIep65TbuuEWePwppDBABggrBgEFBQcBAQQ0MDIw
MAYIKwYBBQUHMAGGJGh0dHA6Ly9vY3NwLmNsb3VkZmxhcmUuY29tL29yaWdpbl9j
YTAhBgNVHREEGjAYggsqLnNvcnZ4LmNvbYIJc29ydnguY29tMDgGA1UdHwQxMC8w
LaAroCmGJ2h0dHA6Ly9jcmwuY2xvdWRmbGFyZS5jb20vb3JpZ2luX2NhLmNybDAN
BgkqhkiG9w0BAQsFAAOCAQEAeRhOIyv9l8smhldOl3Wp7878ry3DQMvWNfaMA9Br
i3xh3yKFfL3SGSSxLA+U25OWJgRWvL55jKW2LouVBSpTNZGw+Ry83BblNwuDkLij
yRgC4FxdHMOBOaIDLUDSi3mGG4t5bH2pvwVIQcXljOXDtQxw8q149LfIz3UzDEY/
1vXWnS3UAbXgCQzupnN6aHxnmLB7rVG8+lwOJQQ63OuQk1UCGBbg7Y2KYKoRXs61
ynZGXQwZQBdjSSQaxMC7IYIf17nHSgD8cMM+vZ2O8DhZNOWAkGnws4jDyvMSHzmx
Cbu5FmNpnxevc5bFQslB7dexCwr/y93HCl2kVRYY+uWs3w==
-----END CERTIFICATE-----
CERT
sed -i 's/\r$//' "$NGINX_SSL_DIR/$DOMAIN.crt"
ok "Certificate written"

# ── Write private key ──────────────────────────────────────────
info "Writing private key..."
cat > "$NGINX_SSL_DIR/$DOMAIN.key" << 'KEY'
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDwHiiJ/CigceXO
65TCgLou6uhru9/riQOD79y6V7djUoccitznysxybvPHjLilxsAASmfbU3g5Ozkk
GsaI/ZloacQsU9nZ5K3pNC2CXbYDU0DknPIKDGWXVwcGQnd/5HrLKojXTxuFCIPn
e9evkFZ/viy4rnNPTEpiWzYDeuPQyHl00ZO9ZCn3Ln8hI6FDlf462f8LYrnaDO5h
bge/nZkDoVGuLbBRCrBQHvH+tiRtuaBrMzs2j5fXShnM2O8rpLgUVOqs3PS0a91G
00L5MYOvSaipCd5gaJG+c/cuO/CQBZxm5wfUcX3we5QGYH6oCiblZ4uuojUfb1XP
vwRuwA9jAgMBAAECggEAXt+jp+WUjdSC9y+Y7wMazWfunoa0kmVoGKzg+1WmNZ3J
mcr6PrGf90UEmF9vI700Zsj/YScJVR+j07KqqDz/bMSBiPw2kwPqfT6rDpwFSyoN
dWbXsYW1bEcsFNqVSdiWdgjf2aa9mmJDb+a8UXeH3eBf3ja7g+UCbPtaC6T2N6sC
eXA/WiKpWU8pISHEfpMCyIGdhKKeT4bBquwxlXxtkz7sEQqp+BaQLNY7PplH6So4
Louep+Ptl9Eq1+R9RCUaT4J2bp88EPrTg3BuoEEHbSLJWRsYDnYkaJbJRhEIJCut
bsBzWey4zkpczvmdmSRR/eSOvVHjZj7cWAK15LWkQKBgQD4d/akyFRlSANQ71eq
6/SixhNhN0HvGRanUHoAZN65ibNEDds2heyRQAPBsuL9e3sWvB7t86f+Sw8nBfrh
VFhnWCgMkt5bmXfb8g6UrWgQ0Bhw9DOb4dSPpAPIRN1tJ9GgTNrt445aNlrGDuFs
JNE/Zfk+oXxXCR4dVaJtm/zPUQKBgQD3ZWU2+ZbhECXfQ7yDg81WdV659mR+ZApR
8b0cRaSrNfd91LFBXDA+xiwzvkScn4E7a+yArL8KomcQcebJeeOUpxIAkbXtW+CZ
OJzbuf9cmLDwP9+BufpT02nQGo4oeyRagum++tU0+DBPOIysg1cy9FKXvyzA0fGH
8HXZojCOcwKBgBdGTYFUDqvKGh1rvh+RqMHSoiAaJ//4rqmPnU4KJN7majd2wNET
rHxSrcdoNWEfPwF7L76Ec3kbmNjD86NF3l4X4PCElXWpI5Qj0X/V2oiwpYl3Jpp0
hg/KglwxLzi5YSaN7HgaN8x1iP1CiZUywbMZn0ZhpB8XCI4g5m00DnNxAoGAMxAr
pwA3QzcJCh86Ds8ql9jb93hC38+YTbeet/Ir/ebCsacv+vSjRKG0x+1Szh0iGHi7
NQfy2qgQq9VGtHlDHxCo55MrwNVA83866SNn8N3XT49ve6A+agTuBzUj+HkKVOBG
jNPLJAbCOefLKWRmoC7LyWR9QUNUHiHkwUn3yb8CgYEAtl1oyZN1XN3DXbsssW40
5k92gd1cW0UBwUvWT8HLqIn8zSNjKXnlqlNv7CwXo3XHvzupFhsFtPtmrm/d/n2z
5gT6IdOfEr2gDGhPsshiTKkodvfmzx1QbS3KcB0bxQArzvUqiLFm0beWLlfnEWIf
wGX1qXOSe/tfNI6Jo1Idx+g=
-----END PRIVATE KEY-----
KEY
chmod 600 "$NGINX_SSL_DIR/$DOMAIN.key"
sed -i 's/\r$//' "$NGINX_SSL_DIR/$DOMAIN.key"
ok "Private key written"

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

    # Cloudflare (strict mode — cert is from Cloudflare origin CA)
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
