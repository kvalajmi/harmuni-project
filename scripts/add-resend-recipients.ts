// Script to add authorized test recipients in Resend
// Run with: npx ts-node scripts/add-resend-recipients.ts

const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY not found in environment variables');
    process.exit(1);
}

const TEST_RECIPIENTS = [
    { email: 'fmhalyami70@gmail.com', firstName: 'فهد', lastName: 'الهاليامي' },
    { email: 'f.3amri07@gmail.com', firstName: 'فهد', lastName: 'العمري' },
];

async function addTestRecipients() {
    console.log('🚀 Adding test recipients to Resend...\n');

    // First, we need to create an audience (if not exists)
    let audienceId: string;

    try {
        // List existing audiences
        const listResponse = await fetch('https://api.resend.com/audiences', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
        });

        const audiences = await listResponse.json();
        console.log('📋 Existing audiences:', audiences);

        // Check if "Test Recipients" audience exists
        const existingAudience = audiences.data?.find((a: any) => a.name === 'Test Recipients');

        if (existingAudience) {
            audienceId = existingAudience.id;
            console.log(`✅ Using existing audience: ${audienceId}\n`);
        } else {
            // Create new audience
            const createResponse = await fetch('https://api.resend.com/audiences', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${RESEND_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: 'Test Recipients' }),
            });

            const newAudience = await createResponse.json();
            audienceId = newAudience.id;
            console.log(`✅ Created new audience: ${audienceId}\n`);
        }

        // Add contacts to audience
        for (const recipient of TEST_RECIPIENTS) {
            const contactResponse = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${RESEND_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: recipient.email,
                    first_name: recipient.firstName,
                    last_name: recipient.lastName,
                    unsubscribed: false,
                }),
            });

            const contact = await contactResponse.json();
            console.log(`📧 Added ${recipient.email}:`, contact);
        }

        console.log('\n✅ All test recipients added successfully!');
        console.log('\n⚠️  IMPORTANT: This adds contacts for broadcasts, but does NOT bypass sandbox restrictions.');
        console.log('   To send transactional emails to these addresses, you need to either:');
        console.log('   1. Verify your domain in Resend dashboard');
        console.log('   2. OR add them manually in Resend Dashboard → Settings → Email Testing');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

addTestRecipients();
