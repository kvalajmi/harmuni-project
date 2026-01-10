#!/bin/bash

# NUCLEAR OPTION: Build completely fresh Docker image with CLEAN env vars
SERVER_IP="167.99.241.118"
SERVER_USER="root"
PASSWORD="Wwifzin-q73183"

echo "🔥 NUCLEAR REBUILD: Creating fresh image with clean env vars..."

# Step 1: Create a CLEAN .env file on the server
echo "📝 Creating CLEAN .env file..."
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" << 'EOF'
cd /app

# Backup old .env
cp .env .env.backup

# Create CLEAN .env (NO SPACES!)
cat > .env << 'ENVFILE'
NEXT_PUBLIC_SUPABASE_URL=https://wefjsxugozhhzubdtpeb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlZmpzeHVnb3poaHp1YmR0cGViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4ODMyNDAsImV4cCI6MjA4MjQ1OTI0MH0.Ef2OEF0hbxpE6JpyFGNhhkdNSoQ2_ec6ixSMnFqePHc
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlZmpzeHVnb3poaHp1YmR0cGViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg4MzI0MCwiZXhwIjoyMDgyNDU5MjQwfQ.FpHEEURuxB0CY5bsT329F-bUUf6lYYCptUlWYsuwR4Q
RESEND_API_KEY=re_NZJu2fe8_Q9Fo3vGDVC1UYxQhnFPUiUKW
CRON_SECRET=harmuni-cron-secret-2024
ONESIGNAL_APP_ID=6d710068-0d52-4ca5-8aa2-79d89d525c27
ONESIGNAL_REST_API_KEY=os_v2_app_nvyqa2ankjgklcvcphmj2us4e767ntwyf4lu5o5u4ujixrlk6bsp5egys46zvwjqzxyhqan3k2psu2fcktoirnvpg7ezrwlncbzltbq
ENVFILE

echo "✅ Clean .env created"
cat .env | head -n 3
EOF

# Step 2: Nuclear rebuild
echo "💣 Performing NUCLEAR rebuild..."
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" << 'EOF'
cd /app

# Stop everything
docker compose -f docker-compose.prod.yml down

# Remove ALL build artifacts
rm -rf .next
rm -rf node_modules/.cache

# Remove old images
docker system prune -af --volumes

# Rebuild from SCRATCH with the CLEAN .env
docker compose -f docker-compose.prod.yml up -d --build --force-recreate

echo "✅ Nuclear rebuild complete!"
docker ps | grep harmuni
EOF

echo ""
echo "🎯 NUCLEAR OPTION COMPLETE!"
echo "🧪 Test now at https://harmuni.org"
