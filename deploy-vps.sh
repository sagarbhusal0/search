#!/usr/bin/env bash
set -euo pipefail

# ───────────────────────────────────────────────────────────
#  Sorvx Search full-stack deploy script (Rust backend + Next.js)
#  Run this ON the VPS after cloning the repo.
# ───────────────────────────────────────────────────────────

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_FILE="docker-compose.vps.yaml"
FRONTEND_ENV_FILE="frontend/.env.production"

# ── colors ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
err()   { echo -e "${RED}[✗]${NC} $1"; exit 1; }

cd "$REPO_DIR"

# ── install docker if missing ──
if [ ! -x /usr/bin/docker ]; then
    warn "Docker not found — installing..."
    apt-get update -qq
    DEBIAN_FRONTEND=noninteractive apt-get install -y -qq docker.io docker-cli docker-compose
    if [ ! -x /usr/bin/docker ] && [ -x /usr/bin/docker-cli ]; then
        ln -sf /usr/bin/docker-cli /usr/bin/docker
    fi
    [ -x /usr/bin/docker ] || err "docker CLI still missing after install"
    info "Docker installed"
fi

# ── start docker daemon if not running ──
docker_ok() {
    docker info &>/dev/null
}
if ! docker_ok; then
    warn "Docker daemon not running — starting..."
    systemctl start docker 2>/dev/null || dockerd &>/dev/null &
    for i in $(seq 1 15); do
        sleep 2
        if docker_ok; then
            info "Docker daemon started"
            break
        fi
    done
    docker_ok || err "Failed to start Docker daemon after 30s"
fi

# ── detect compose command ──
COMPOSE_CMD=""
if docker compose version &>/dev/null; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose &>/dev/null; then
    COMPOSE_CMD="docker-compose"
else
    err "Neither 'docker compose' plugin nor 'docker-compose' found"
fi
info "Using: $COMPOSE_CMD"

# ── build frontend .env ──
info "Writing $FRONTEND_ENV_FILE"
cat > "$FRONTEND_ENV_FILE" <<EOF
PHP_BACKEND_URL=http://backend:3001
EOF

# ── build & start ──
info "Building and starting all services..."
$COMPOSE_CMD -f "$COMPOSE_FILE" down --remove-orphans 2>/dev/null || true
$COMPOSE_CMD -f "$COMPOSE_FILE" build --pull
$COMPOSE_CMD -f "$COMPOSE_FILE" up -d

# ── health check ──
info "Waiting for services to become healthy..."
sleep 10

check_service() {
    local name=$1 url=$2
    for i in $(seq 1 12); do
        if $COMPOSE_CMD -f "$COMPOSE_FILE" exec -T "$name" wget --no-verbose --tries=1 --spider "$url" 2>/dev/null; then
            info "$name is healthy"
            return 0
        fi
        sleep 5
    done
    warn "$name health check timed out"
    return 1
}

check_service "backend"  "http://localhost:3001/healthz.php" || true
check_service "frontend" "http://localhost:3000/api/health" || true

# ── print info ──
echo ""
info "Deployment complete!"
echo ""
echo "  Frontend:  http://$(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_VPS_IP'):3000"
echo "  Backend:   http://localhost:3001 (internal)"
echo ""
echo "  Logs:      $COMPOSE_CMD -f $COMPOSE_FILE logs -f"
echo "  Stop:      $COMPOSE_CMD -f $COMPOSE_FILE down"
echo ""
