#!/usr/bin/expect -f

set timeout 30
set password "HarmuniTask2024!Secure"

spawn ssh -o StrictHostKeyChecking=no root@167.99.241.118

expect {
    "password:" {
        send "$password\r"
        exp_continue
    }
    "root@*" {
        send "cd /app && docker ps | grep harmuni\r"
        expect "root@*"
        send "exit\r"
    }
}

expect eof