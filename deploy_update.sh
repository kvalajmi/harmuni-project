#!/bin/bash

# Deployment script for pulling and deploying the latest Docker image
SERVER_IP="167.99.241.118"
SERVER_USER="root"
SERVER_PASSWORD="HarmuniTask2024!Secure"
DOCKER_IMAGE="kvalajmi/harmuni-task:latest"

echo "🚀 بدء عملية النشر على السيرفر..."
echo "📍 السيرفر: $SERVER_IP"
echo "🐳 Docker Image: $DOCKER_IMAGE"
echo ""

# Create expect script
cat > /tmp/deploy_expect.sh << 'EOF'
#!/usr/bin/expect -f

set timeout 60
set password [lindex $argv 0]
set server_ip [lindex $argv 1]

spawn ssh -o StrictHostKeyChecking=no root@$server_ip

expect {
    "password:" {
        send "$password\r"
        exp_continue
    }
    "root@*" {
        send "cd /app\r"
        expect "root@*"

        send "echo '📥 سحب أحدث Docker image...'\r"
        expect "root@*"
        send "docker pull kvalajmi/harmuni-task:latest\r"
        expect "root@*" {
            sleep 2
        }

        send "echo '🔄 إعادة تشغيل الـ container...'\r"
        expect "root@*"
        send "docker compose down\r"
        expect "root@*" {
            sleep 1
        }

        send "docker compose up -d\r"
        expect "root@*" {
            sleep 2
        }

        send "echo '✅ التحقق من حالة الـ container...'\r"
        expect "root@*"
        send "docker ps | grep harmuni\r"
        expect "root@*"

        send "exit\r"
    }
}

expect eof
EOF

chmod +x /tmp/deploy_expect.sh

# Run the expect script
echo "🔐 الاتصال بالسيرفر..."
/tmp/deploy_expect.sh "$SERVER_PASSWORD" "$SERVER_IP"

# Cleanup
rm /tmp/deploy_expect.sh

echo ""
echo "✅ تم النشر بنجاح!"
echo "🌐 يمكنك الآن زيارة https://harmuni.org للتحقق من التحديث"
