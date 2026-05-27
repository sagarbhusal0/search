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

# ── checks ──
command -v docker >/dev/null 2>&1 || err "Docker is not installed"
command -v docker compose >/dev/null 2>&1 || err "Docker Compose plugin is not installed"

cd "$REPO_DIR"

# ── build frontend .env ──
info "Writing $FRONTEND_ENV_FILE"
cat > "$FRONTEND_ENV_FILE" <<EOF
PHP_BACKEND_URL=http://backend:3001
EOF

# ── build & start ──
info "Building and starting all services..."
docker compose -f "$COMPOSE_FILE" down --remove-orphans 2>/dev/null || true
docker compose -f "$COMPOSE_FILE" build --pull
docker compose -f "$COMPOSE_FILE" up -d

# ── health check ──
info "Waiting for services to become healthy..."
sleep 10

check_service() {
    local name=$1 url=$2
    for i in $(seq 1 12); do
        if docker compose -f "$COMPOSE_FILE" exec -T "$name" wget --no-verbose --tries=1 --spider "$url" 2>/dev/null; then
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
echo "  Logs:      docker compose -f $COMPOSE_FILE logs -f"
echo "  Stop:      docker compose -f $COMPOSE_FILE down"
echo ""
