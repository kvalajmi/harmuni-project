import { NextResponse } from 'next/server'
import { Resend } from 'resend'

// API route to manage test recipients
// POST /api/resend/add-recipients
export async function POST(request: Request) {
    const resend = new Resend(process.env.RESEND_API_KEY)

    if (!process.env.RESEND_API_KEY) {
        return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
    }

    const TEST_RECIPIENTS = [
        { email: 'fmhalyami70@gmail.com', firstName: 'فهد', lastName: 'الهاليامي' },
        { email: 'f.3amri07@gmail.com', firstName: 'فهد', lastName: 'العمري' },
    ]

    const results: any[] = []

    try {
        // List audiences first
        const audiencesList = await resend.audiences.list()
        console.log('Audiences:', audiencesList)

        let audienceId: string

        // Find or create "Test Recipients" audience
        const existingAudience = audiencesList.data?.data?.find((a: any) => a.name === 'Test Recipients')

        if (existingAudience) {
            audienceId = existingAudience.id
            results.push({ step: 'audience', status: 'found', id: audienceId })
        } else {
            const newAudience = await resend.audiences.create({ name: 'Test Recipients' })
            if (newAudience.error) {
                return NextResponse.json({ error: newAudience.error }, { status: 500 })
            }
            audienceId = newAudience.data!.id
            results.push({ step: 'audience', status: 'created', id: audienceId })
        }

        // Add each recipient as a contact
        for (const recipient of TEST_RECIPIENTS) {
            const contactResult = await resend.contacts.create({
                audienceId,
                email: recipient.email,
                firstName: recipient.firstName,
                lastName: recipient.lastName,
                unsubscribed: false,
            })

            results.push({
                step: 'contact',
                email: recipient.email,
                result: contactResult.data || contactResult.error,
            })
        }

        return NextResponse.json({
            success: true,
            results,
            note: 'Contacts added to audience. For sandbox bypass, domain verification is still required.',
        })

    } catch (error) {
        console.error('Error:', error)
        return NextResponse.json({ error: String(error) }, { status: 500 })
    }
}

// GET - Check current audiences and contacts
export async function GET() {
    const resend = new Resend(process.env.RESEND_API_KEY)

    if (!process.env.RESEND_API_KEY) {
        return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
    }

    try {
        const audiences = await resend.audiences.list()
        return NextResponse.json({ audiences: audiences.data })
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 })
    }
}
