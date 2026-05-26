<#
.SYNOPSIS
  Sorvx Search — local development/test launcher for Windows
.DESCRIPTION
  Starts the Next.js frontend in dev mode (hot reload) for local testing.
  The PHP backend requires Docker — if unavailable, the frontend runs alone.
#>

$ErrorActionPreference = "Stop"
$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path
$FE = Join-Path $ROOT "frontend"

function Write-Step($s) { Write-Host "  * $s" -ForegroundColor DarkGray }
function Write-ok($s)  { Write-Host "  ✓ $s" -ForegroundColor Green }
function Write-wrn($s) { Write-Host "  ! $s" -ForegroundColor Yellow }
function Write-err($s) { Write-Host "  ✗ $s" -ForegroundColor Red }

Clear-Host
Write-Host ""
Write-Host "  ┌─────────────────────────────────────────────┐" -ForegroundColor Cyan
Write-Host "  │      Sorvx Search  —  Local Test Launcher   │" -ForegroundColor Cyan
Write-Host "  │           Windows Dev Server                │" -ForegroundColor Cyan
Write-Host "  └─────────────────────────────────────────────┘" -ForegroundColor Cyan
Write-Host ""

# ── Prerequisites ──────────────────────────────────────────────
Write-Step "Checking prerequisites..."

$nodeVer = node --version 2>$null
if (-not $nodeVer) {
  Write-err "Node.js is not installed. Get it from https://nodejs.org/"
  exit 1
}
Write-ok "Node.js $nodeVer"

$npmVer = npm --version 2>$null
Write-ok "npm $npmVer"

# ── PHP backend check ──────────────────────────────────────────
$dockerAvail = (Get-Command docker -ErrorAction SilentlyContinue) -ne $null

Write-Step "Checking PHP backend..."
if ($dockerAvail) {
  Write-ok "Docker Desktop found — will start PHP backend via docker-compose"
  $useDocker = $true
} else {
  Write-wrn "Docker Desktop not found — API calls will fail (search, images, etc.)"
  Write-wrn "Install from: https://www.docker.com/products/docker-desktop/"
  $useDocker = $false
  ""
  $choice = Read-Host "  Continue without backend? [Y/n]"
  if ($choice -eq "n" -or $choice -eq "N") { exit 0 }
}

# ── Install dependencies ───────────────────────────────────────
Write-Step "Installing frontend dependencies..."
Set-Location $FE
npm install 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-err "npm install failed"
  exit 1
}
Write-ok "Dependencies installed"

# ── Start services ─────────────────────────────────────────────
if ($useDocker) {
  Write-Step "Starting PHP backend via Docker..."
  Set-Location $ROOT
  docker compose up --build -d fourget 2>&1 | Out-Null
  if ($LASTEXITCODE -eq 0) {
    Write-ok "PHP backend running at http://localhost:8080"
  } else {
    Write-wrn "Docker failed. Try: docker compose up -d --build"
  }
}

Write-Step "Starting Next.js frontend (dev mode)..."
Write-Host ""
Write-Host "  ─────────────────────────────────────────────" -ForegroundColor DarkGray
Write-Host "  Frontend : http://localhost:3000" -ForegroundColor Cyan
if ($useDocker) {
  Write-Host "  Backend  : http://localhost:8080" -ForegroundColor DarkGray
}
Write-Host "  ─────────────────────────────────────────────" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

try {
  $env:NEXT_TELEMETRY_DISABLED = "1"
  if ($useDocker) {
    $env:PHP_BACKEND_URL = "http://localhost:8080"
  }
  Set-Location $FE
  npm run dev
} finally {
  Write-Host ""
  Write-Step "Shutting down..."
  if ($useDocker) {
    Set-Location $ROOT
    docker compose down 2>&1 | Out-Null
    Write-ok "Docker containers stopped"
  }
  Write-ok "Sorvx local session ended"
}
