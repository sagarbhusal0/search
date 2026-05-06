#!/bin/bash

# 4get Deployment Script
# This script should reside on your VPS (e.g., at ~/deploy.sh)

# Exit on error
set -e

# Navigate to the project directory
# MATCHES your server path: ~/search
PROJECT_DIR="/root/search"

echo "🚀 Starting deployment..."

if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ Error: Project directory $PROJECT_DIR does not exist."
    exit 1
fi

cd "$PROJECT_DIR"

echo "📥 Pulling latest changes from GitHub..."
git pull origin main

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
