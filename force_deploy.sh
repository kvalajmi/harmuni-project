#!/bin/bash

# Force Deploy Script - Bypassing GitHub Actions
# Uploads modified files and rebuilds on server

SERVER_IP="167.99.241.118"
SERVER_USER="root"
PASSWORD="Wwifzin-q73183"

echo "🚀 Starting FORCE DEPLOYMENT..."

# List of files to update
FILES=(
    "src/lib/staff-actions.ts"
    "src/app/dashboard/tasks/[id]/page.tsx"
    "src/lib/supabase-browser.ts"
    "src/lib/supabase.ts"
)

# 1. Upload Files
echo "📤 Uploading modified files..."

for file in "${FILES[@]}"; do
    echo "  - Uploading $file..."
    # Create directory on server just in case
    dir=$(dirname "$file")
    sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "mkdir -p /app/$dir"
    sshpass -p "$PASSWORD" scp -o StrictHostKeyChecking=no "$file" "$SERVER_USER@$SERVER_IP:/app/$file"
done

# 2. Rebuild on Server
echo "🏗️  Rebuilding Docker container on server (This may take a few minutes)..."
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" << 'EOF'
    cd /app
    echo "  - Stopping current container..."
    docker compose -f docker-compose.prod.yml down
    echo "  - Building new image from local source..."
    docker compose -f docker-compose.prod.yml up -d --build
    echo "  - Pruning old images..."
    docker system prune -f
    echo "✅ Server Rebuild Complete!"
EOF

echo "✨ Force Deploy Finished successfully!"
