#!/bin/bash

# FINAL SOLUTION: Build clean image on server and deploy it
SERVER_IP="167.99.241.118"
SERVER_USER="root"
PASSWORD="Wwifzin-q73183"

echo "🏗️  Building CLEAN image on server with proper env vars..."

sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" << 'EOF'
cd /app

echo "📦 Step 1: Stop current container..."
docker compose -f docker-compose.prod.yml down

echo "🧹 Step 2: Remove old build artifacts..."
rm -rf .next

echo "🔨 Step 3: Build new image with CLEAN env vars (no spaces!)..."
docker build \
  --no-cache \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://wefjsxugozhhzubdtpeb.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlZmpzeHVnb3poaHp1YmR0cGViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4ODMyNDAsImV4cCI6MjA4MjQ1OTI0MH0.Ef2OEF0hbxpE6JpyFGNhhkdNSoQ2_ec6ixSMnFqePHc \
  --build-arg SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlZmpzeHVnb3poaHp1YmR0cGViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg4MzI0MCwiZXhwIjoyMDgyNDU5MjQwfQ.FpHEEURuxB0CY5bsT329F-bUUf6lYYCptUlWYsuwR4Q \
  -t kvalajmi/harmuni-task:latest \
  -f Dockerfile \
  .

echo "🚀 Step 4: Start container with new image..."
docker compose -f docker-compose.prod.yml up -d

echo "✅ Done! New clean image is running."
docker ps | grep harmuni
EOF

echo ""
echo "✨ Build complete! Test https://harmuni.org now"
