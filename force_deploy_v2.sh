#!/bin/bash

# Force Deploy Script v2 - With Dockerfile Fix
SERVER_IP="167.99.241.118"
SERVER_USER="root"
PASSWORD="Wwifzin-q73183"

echo "🚀 Starting FORCE DEPLOYMENT with Dockerfile fix..."

# Upload Dockerfile (THE CRITICAL FIX)
echo "📤 Uploading fixed Dockerfile..."
sshpass -p "$PASSWORD" scp -o StrictHostKeyChecking=no "Dockerfile" "$SERVER_USER@$SERVER_IP:/app/Dockerfile"

# Rebuild on Server
echo "🏗️  Rebuilding Docker image on server (This will take 3-5 minutes)..."
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" << 'EOF'
    cd /app
    echo "  - Removing old build artifacts..."
    rm -rf .next
    echo "  - Stopping current container..."
    docker compose -f docker-compose.prod.yml down
    echo "  - Building new image with sanitized env vars..."
    docker compose -f docker-compose.prod.yml up -d --build
    echo "  - Pruning old images..."
    docker system prune -f
    echo "✅ Server Rebuild Complete!"
    echo "📊 Container Status:"
    docker ps | grep harmuni
EOF

echo ""
echo "✨ Force Deploy Finished!"
echo "🌐 Test at https://harmuni.org"
