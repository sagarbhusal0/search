#!/bin/bash

# Sorvx Search Deployment Script
# This script should reside on your VPS (e.g., at ~/deploy.sh)

# Exit on error
set -e

# Navigate to the project directory
# MATCHES your server path: ~/search
PROJECT_DIR="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"

echo "🚀 Starting deployment..."

if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ Error: Project directory $PROJECT_DIR does not exist."
    exit 1
fi

cd "$PROJECT_DIR"

echo "📥 Pulling latest changes from GitHub..."
git pull origin main

echo "🔒 Applying firewall rules to protect PHP backend..."
# Block external access to port 8080 (PHP backend) — only allow from Docker bridge network
# This is defense-in-depth since docker-compose no longer exposes port 8080 publicly
if command -v iptables &> /dev/null; then
    # Allow Docker bridge network (172.x.x.x) to access port 8080
    iptables -C INPUT -p tcp --dport 8080 -s 172.0.0.0/8 -j ACCEPT 2>/dev/null || \
        iptables -A INPUT -p tcp --dport 8080 -s 172.0.0.0/8 -j ACCEPT
    # Allow localhost to access port 8080
    iptables -C INPUT -p tcp --dport 8080 -s 127.0.0.0/8 -j ACCEPT 2>/dev/null || \
        iptables -A INPUT -p tcp --dport 8080 -s 127.0.0.0/8 -j ACCEPT
    # Block everyone else
    iptables -C INPUT -p tcp --dport 8080 -j DROP 2>/dev/null || \
        iptables -A INPUT -p tcp --dport 8080 -j DROP
    echo "   iptables rules applied for port 8080."
else
    echo "   ⚠️  iptables not found. Install it or configure your cloud firewall to block port 8080."
fi

echo "🏗️ Rebuilding and restarting Docker containers..."
# Detect which docker compose command is available
if docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose"
elif docker-compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker-compose"
else
    echo "❌ Error: Neither 'docker compose' nor 'docker-compose' was found."
    echo "Please install it: sudo apt-get update && sudo apt-get install docker-compose-plugin"
    exit 1
fi

echo "Using: $DOCKER_COMPOSE"
$DOCKER_COMPOSE up -d --build

echo "🧹 Cleaning up old images..."
docker image prune -f

echo "✅ Deployment successful!"
echo ""
echo "🌐 Frontend should be available at http://$(curl -s ifconfig.me 2>/dev/null || echo 'your-server-ip'):3000"
echo ""
echo "🔐 Note: The PHP backend API is NOT exposed publicly."
echo "   It is only accessible from within the Docker network (frontend → fourget:80)."
echo "   To debug the backend directly: docker compose exec fourget /bin/sh"
