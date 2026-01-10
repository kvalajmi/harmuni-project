#!/bin/bash
set -e

echo "🔥 NUCLEAR DEPLOYMENT INITIATED 🔥"
echo "=================================="

SERVER="root@167.99.241.118"
PASSWORD="Wwifzin-q73183"
SERVER_PATH="/root/attendance-system"

echo ""
echo "Phase 1: Stopping and destroying everything on server..."
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER << ENDSSH
cd $SERVER_PATH
echo "Stopping containers..."
docker compose down || true
echo "Removing ALL Docker images..."
docker rmi -f \$(docker images -q) 2>/dev/null || true
echo "Pruning Docker system..."
docker system prune -af --volumes || true
echo "Removing build artifacts..."
rm -rf .next node_modules .turbo || true
echo "Server cleaned ✓"
ENDSSH

echo ""
echo "Phase 2: Uploading fresh code..."
sshpass -p "$PASSWORD" scp -o StrictHostKeyChecking=no \
  "/Users/abofahad/Desktop/مشاريعي الي مسويها /harmuni task v2/src/app/dashboard/page.tsx" \
  $SERVER:$SERVER_PATH/src/app/dashboard/page.tsx

echo ""
echo "Phase 3: Rebuilding from scratch on server..."
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER << ENDSSH
cd $SERVER_PATH
echo "Starting fresh build..."
docker compose -f docker-compose.prod.yml up -d --build --force-recreate --no-cache
echo "Waiting for container to be healthy..."
sleep 15
docker ps
docker logs attendance-system-web-1 --tail 50
echo "Rebuild complete ✓"
ENDSSH

echo ""
echo "Phase 4: Clearing Cloudflare cache..."
CLOUDFLARE_ZONE_ID="3697d14c03267a10d4d51fa0086b3f53"
CLOUDFLARE_API_TOKEN="Edy_MmmPSk1z3M_9rYlMnl8S2a4fwTNq8VzJT6sZ"

RESPONSE=\$(curl -X POST "https://api.cloudflare.com/client/v4/zones/\$CLOUDFLARE_ZONE_ID/purge_cache" \
  -H "Authorization: Bearer \$CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}' \
  --silent)

echo "\$RESPONSE"
echo ""
echo "✅ NUCLEAR DEPLOYMENT COMPLETE"
echo "=================================="
