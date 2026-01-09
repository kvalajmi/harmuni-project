#!/bin/bash

echo "🔄 Updating Harmuni Task from Docker Hub..."

# Pull latest image
echo "📥 Pulling latest image..."
docker pull kvalajmi/harmuni-task:latest

# Stop current container
echo "🛑 Stopping current container..."
docker compose -f docker-compose.prod.yml down

# Start new container
echo "🚀 Starting new container..."
docker compose -f docker-compose.prod.yml up -d

# Check status
echo "✅ Checking status..."
docker ps | grep harmuni

echo ""
echo "✨ Update complete!"
echo "🌐 Visit https://harmuni.org to see the changes"
