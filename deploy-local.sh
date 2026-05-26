#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
FE="$ROOT/frontend"

info()  { echo -e "  \e[36m*\e[0m $1"; }
ok()    { echo -e "  \e[32m\u2713\e[0m $1"; }
warn()  { echo -e "  \e[33m!\e[0m $1"; }
err()   { echo -e "  \e[31m\u2717\e[0m $1"; }

clear
cat << 'EOF'

  ┌─────────────────────────────────────────────┐
  │      Sorvx Search  —  Local Test Launcher   │
  │              WSL Dev Server                 │
  └─────────────────────────────────────────────┘

EOF

# ── Prerequisites ──────────────────────────────────────────────
info "Checking prerequisites..."

if ! command -v node &>/dev/null; then
  err "Node.js not found. Install it:"
  err "  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -"
  err "  sudo apt install -y nodejs"
  exit 1
fi
ok "Node.js $(node --version)"

# ── Docker check ───────────────────────────────────────────────
info "Checking PHP backend..."
USE_DOCKER=false
if docker --version &>/dev/null 2>&1; then
  ok "Docker found — will start PHP backend via docker compose"
  USE_DOCKER=true
else
  warn "Docker not found — API calls will fail (search, images, etc.)"
  warn "Install: https://docs.docker.com/engine/install/ubuntu/"
  echo ""
  read -rp "  Continue without backend? [Y/n] " choice
  if [[ "$choice" == "n" || "$choice" == "N" ]]; then exit 0; fi
fi

# ── Pull latest changes ────────────────────────────────────────
info "Pulling latest code from git..."
cd "$ROOT"
if ! git diff --quiet 2>/dev/null; then
  warn "Uncommitted changes detected — stashing them before pull"
  git stash push -m "auto-stash by deploy-local.sh" 2>/dev/null || true
fi
if git pull --ff-only origin main 2>/dev/null; then
  ok "Up to date with origin/main"
else
  warn "Git pull failed (offline or no upstream). Continuing with local code."
fi

# ── Install dependencies ───────────────────────────────────────
info "Installing frontend dependencies..."
cd "$FE"
npm install --silent 2>/dev/null
ok "Dependencies installed"

# ── Start services ─────────────────────────────────────────────
if $USE_DOCKER; then
  info "Starting PHP backend via Docker..."
  cd "$ROOT"
  docker compose up --build -d fourget 2>/dev/null
  if [ $? -eq 0 ]; then
    ok "PHP backend running at http://localhost:8080"
  else
    warn "Docker failed. Try: docker compose up -d --build"
  fi
fi

info "Starting Next.js frontend (dev mode)..."
echo ""
echo -e "  \e[35m─────────────────────────────────────────────\e[0m"
echo -e "  \e[36mFrontend : http://localhost:3000\e[0m"
if $USE_DOCKER; then
  echo -e "  Backend  : http://localhost:8080"
fi
echo -e "  \e[35m─────────────────────────────────────────────\e[0m"
echo ""
echo -e "  \e[33mPress Ctrl+C to stop\e[0m"
echo ""

export NEXT_TELEMETRY_DISABLED=1
if $USE_DOCKER; then
  export PHP_BACKEND_URL="http://localhost:8080"
fi
cd "$FE"
npm run dev
