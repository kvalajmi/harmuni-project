#!/usr/bin/env node

// Test OneSignal API directly
// Run: node test-onesignal-api.js

const ONESIGNAL_APP_ID = '6d710068-0d52-4ca5-8aa2-79d89d525c27'
const ONESIGNAL_REST_API_KEY = 'os_v2_app_nvyqa2ankjgklcvcphmj2us4e767ntwyf4lu5o5u4ujixrlk6bsp5egys46zvwjqzxyhqan3k2psu2fcktoirnvpg7ezrwlncbzltbq'

async function testOneSignalAPI() {
    console.log('=== OneSignal API Test ===')
    console.log('App ID:', ONESIGNAL_APP_ID)
    console.log('API Key:', ONESIGNAL_REST_API_KEY.substring(0, 20) + '...')
    console.log('')

    // Test 1: Send to specific External IDs (from screenshot)
    const testUserIds = ['df3a4d08-8d1f-424b-abac-b580499648df'] // Example from OneSignal users list

    console.log('Test 1: Sending to specific External ID...')
    console.log('User IDs:', testUserIds)

    const payload = {
        app_id: ONESIGNAL_APP_ID,
        include_aliases: {
            external_id: testUserIds
        },
        target_channel: 'push',
        headings: { ar: 'اختبار API مباشر', en: 'Direct API Test' },
        contents: { ar: 'هذا اختبار من Node.js script', en: 'This is a test from Node.js script' },
        url: 'https://harmuni.org/dashboard',
        data: { test: 'true' },
        ios_badgeType: 'Increase',
        ios_badgeCount: 1,
        web_url: 'https://harmuni.org/dashboard',
        priority: 10
    }

    console.log('Payload:', JSON.stringify(payload, null, 2))
    console.log('')

    try {
        const response = await fetch('https://onesignal.com/api/v1/notifications', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })

        const result = await response.json()

        console.log('Response Status:', response.status, response.statusText)
        console.log('Response Body:', JSON.stringify(result, null, 2))
        console.log('')

        if (response.ok) {
            console.log('✅ SUCCESS! Notification ID:', result.id)
            console.log('Recipients:', result.recipients)
        } else {
            console.log('❌ FAILED!')
            console.log('Errors:', result.errors || result.error)
        }
    } catch (error) {
        console.log('❌ EXCEPTION:', error.message)
    }

    console.log('')
    console.log('=== Test Complete ===')
}

testOneSignalAPI()
