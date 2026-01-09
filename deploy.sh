#!/bin/bash

# Deploy script for Harmuni Task
SERVER_IP="167.99.241.118"
SERVER_USER="root"
SERVER_PATH="/app"

echo "🚀 Starting deployment to $SERVER_IP..."

# Files to upload
echo "📦 Preparing files..."
FILES_TO_UPLOAD=(
    "src/lib/supabase-browser.ts"
    "src/lib/hooks.ts"
    "src/lib/employee-task-actions.ts"
    "src/components/dashboard/EmployeeTasksTab.tsx"
    "src/components/create-employee-task-drawer.tsx"
)

echo "📤 Uploading files..."
echo "Please enter the server password when prompted:"

# Upload each file
for file in "${FILES_TO_UPLOAD[@]}"; do
    echo "  - Uploading $file"
    scp -o StrictHostKeyChecking=no "$file" "$SERVER_USER@$SERVER_IP:$SERVER_PATH/$file"
done

echo "🔧 Rebuilding Docker container..."
ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" << 'ENDSSH'
cd /app
echo "  - Stopping current container..."
docker compose down
echo "  - Building and starting new container..."
docker compose up -d --build
echo "  - Checking status..."
docker ps | grep harmuni
ENDSSH

echo "✅ Deployment complete!"
echo "🌐 Visit https://harmuni.org to see the changes"