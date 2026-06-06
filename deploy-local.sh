#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
err()   { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# Build backend
info "Building Rust backend..."
cd 4get-rs
cargo build 2>&1 | tail -3
info "Backend built"

# Build frontend
info "Building Next.js frontend..."
cd ../frontend
npm run build 2>&1 | tail -3
info "Frontend built"

# Kill existing processes
info "Stopping existing services..."
pkill -f 'sorvx.*config.toml' 2>/dev/null || true
sleep 1

# Start backend
info "Starting backend on port 3001..."
cd ../4get-rs
nohup target/debug/sorvx --config config.toml > /tmp/sorvx-backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > /tmp/sorvx-backend.pid
info "Backend PID: $BACKEND_PID"

# Wait for backend to be ready
sleep 3
if curl -s --max-time 5 http://localhost:3001/healthz.php > /dev/null 2>&1; then
    info "Backend is healthy"
else
    warn "Backend health check failed, check /tmp/sorvx-backend.log"
fi

# Start frontend
info "Starting frontend on port 3000..."
cd ../frontend
nohup npm start > /tmp/sorvx-frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > /tmp/sorvx-frontend.pid
info "Frontend PID: $FRONTEND_PID"

echo ""
info "Deployment complete!"
echo ""
echo "  Frontend:  http://$(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_IP'):3000"
echo "  Backend:   http://localhost:3001"
echo ""
echo "  Stop backend:  kill \$(cat /tmp/sorvx-backend.pid)"
echo "  Stop frontend: kill \$(cat /tmp/sorvx-frontend.pid)"
echo "  Logs:          tail -f /tmp/sorvx-backend.log /tmp/sorvx-frontend.log"
echo ""
