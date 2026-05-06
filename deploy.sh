#!/bin/bash

# 4get Deployment Script
# This script should reside on your VPS (e.g., at ~/deploy.sh)

# Exit on error
set -e

# Navigate to the project directory
# REPLACE THIS with the actual path on your server
PROJECT_DIR="/var/www/4get"

echo "🚀 Starting deployment..."

if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ Error: Project directory $PROJECT_DIR does not exist."
    exit 1
fi

cd "$PROJECT_DIR"

echo "📥 Pulling latest changes from GitHub..."
git pull origin main

echo "🏗️ Rebuilding and restarting Docker containers..."
# --build ensures the local Dockerfile is rebuilt with the new code
# -d runs it in the background
docker compose up -d --build

echo "🧹 Cleaning up old images..."
docker image prune -f

echo "✅ Deployment successful!"
