#!/bin/bash

# WhatsApp Bulk Messaging System - Production Start Script

echo "🚀 Starting WhatsApp Bulk Messaging System..."

# Create necessary directories
mkdir -p sessions logs uploads

# Set permissions
chmod 755 sessions logs uploads

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build frontend if needed
if [ ! -d "frontend/dist" ]; then
    echo "🏗️ Building frontend..."
    npm run build
fi

# Start the application
echo "✅ Starting server..."
npm start
