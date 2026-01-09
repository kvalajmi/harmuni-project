#!/bin/bash

# Manual deployment script - you'll be prompted for password
SERVER_IP="167.99.241.118"
SERVER_USER="root"
DOCKER_IMAGE="kvalajmi/harmuni-task:latest"

echo "🚀 بدء عملية النشر على السيرفر..."
echo "📍 السيرفر: $SERVER_IP"
echo "🐳 Docker Image: $DOCKER_IMAGE"
echo ""
echo "⚠️  سيتم طلب كلمة مرور السيرفر..."
echo ""

# Connect to server and run deployment commands
ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" << 'ENDSSH'
cd /app

echo "📥 سحب أحدث Docker image..."
docker pull kvalajmi/harmuni-task:latest

echo ""
echo "🛑 إيقاف الـ container الحالي..."
docker compose down

echo ""
echo "🚀 تشغيل الـ container الجديد..."
docker compose up -d

echo ""
echo "✅ التحقق من حالة الـ container..."
docker ps | grep harmuni

echo ""
echo "📊 عرض logs الأخيرة..."
docker compose logs --tail=20

ENDSSH

echo ""
echo "✅ تم النشر بنجاح!"
echo "🌐 يمكنك الآن زيارة https://harmuni.org للتحقق من التحديث"
