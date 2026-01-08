import { Resend } from 'resend'

// Initialize Resend client
const resendApiKey = process.env.RESEND_API_KEY

// Only create client if API key is available
const resend = resendApiKey ? new Resend(resendApiKey) : null

export interface TaskEmailData {
  to: string
  recipientName: string
  taskTitle: string
  taskDescription?: string
  priority: 'low' | 'medium' | 'high'
  assignerName: string
  dashboardUrl: string
}

const priorityLabels = {
  low: { text: 'منخفضة', color: '#22c55e', bgColor: '#22c55e20' },
  medium: { text: 'متوسطة', color: '#f59e0b', bgColor: '#f59e0b20' },
  high: { text: 'عالية', color: '#ef4444', bgColor: '#ef444420' }
}

export async function sendTaskEmail(data: TaskEmailData): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.log('[Email] Resend not configured, skipping email')
    return { success: false, error: 'Email not configured' }
  }

  const { to, recipientName, taskTitle, taskDescription, priority, assignerName, dashboardUrl } = data
  const priorityInfo = priorityLabels[priority]

  try {
    const { error } = await resend.emails.send({
      from: 'Harmuni Task <noreply@harmuni.org>',
      to: [to],
      subject: `📋 مهمة جديدة: ${taskTitle}`,
      html: `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div style="text-align: center; padding: 30px 0;">
      <div style="display: inline-block; width: 60px; height: 60px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); border-radius: 16px; line-height: 60px; color: white; font-size: 24px;">
        ✓
      </div>
      <h1 style="color: #ffffff; font-size: 24px; margin: 20px 0 10px;">مهمة جديدة</h1>
      <p style="color: #94a3b8; margin: 0;">تم تعيين مهمة جديدة لك في Harmuni Task</p>
    </div>

    <!-- Content Card -->
    <div style="background-color: #1e293b; border-radius: 16px; padding: 24px; border: 1px solid #334155;">
      <!-- Greeting -->
      <p style="color: #e2e8f0; font-size: 16px; margin: 0 0 20px;">
        مرحباً ${recipientName}،
      </p>

      <!-- Task Title -->
      <div style="background-color: #0f172a; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
        <h2 style="color: #ffffff; font-size: 20px; margin: 0 0 8px;">${taskTitle}</h2>
        ${taskDescription ? `<p style="color: #94a3b8; font-size: 14px; margin: 0;">${taskDescription}</p>` : ''}
      </div>

      <!-- Priority & Info -->
      <div style="display: flex; gap: 12px; margin-bottom: 20px;">
        <div style="flex: 1; background-color: ${priorityInfo.bgColor}; border-radius: 8px; padding: 12px; text-align: center;">
          <span style="color: ${priorityInfo.color}; font-size: 14px; font-weight: 600;">
            الأولوية: ${priorityInfo.text}
          </span>
        </div>
      </div>

      <!-- Assigner Info -->
      <p style="color: #94a3b8; font-size: 14px; margin: 0 0 24px;">
        تم التعيين بواسطة: <strong style="color: #e2e8f0;">${assignerName}</strong>
      </p>

      <!-- CTA Button -->
      <a href="${dashboardUrl}" style="display: block; text-align: center; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-size: 16px; font-weight: 600;">
        عرض المهمة في التطبيق
      </a>
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding: 24px 0;">
      <p style="color: #64748b; font-size: 12px; margin: 0;">
        Harmuni Task - نظام إدارة المهام والتوزيع
      </p>
    </div>
  </div>
</body>
</html>
      `.trim()
    })

    if (error) {
      console.error('[Email] Send error:', error)
      return { success: false, error: error.message }
    }

    console.log(`[Email] Sent to ${to}`)
    return { success: true }

  } catch (error) {
    console.error('[Email] Exception:', error)
    return { success: false, error: 'Failed to send email' }
  }
}

// Batch send emails to multiple recipients
export async function sendTaskEmailsBatch(
  emails: TaskEmailData[]
): Promise<{ sent: number; failed: number }> {
  let sent = 0
  let failed = 0

  // Send emails in parallel with a limit
  const batchSize = 5
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize)
    const results = await Promise.all(batch.map(sendTaskEmail))

    for (const result of results) {
      if (result.success) sent++
      else failed++
    }
  }

  return { sent, failed }
}

// Reminder Email for pending tasks
export interface ReminderEmailData {
  to: string
  recipientName: string
  type: 'task' | 'circular'
  items: { title: string; url: string }[]
}

export async function sendReminderEmail(data: ReminderEmailData): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.log('[Email] Resend not configured, skipping reminder email')
    return { success: false, error: 'Email not configured' }
  }

  const { to, recipientName, type, items } = data
  const isTask = type === 'task'
  const emoji = isTask ? '📋' : '📢'
  const typeLabel = isTask ? 'مهام معلقة' : 'تعاميم لم تقرأها'
  const itemLabel = isTask ? 'مهمة' : 'تعميم'

  const itemsHtml = items.map(item => `
    <div style="background-color: #0f172a; border-radius: 8px; padding: 12px; margin-bottom: 8px;">
      <a href="${item.url}" style="color: #3b82f6; text-decoration: none; font-weight: 500;">${item.title}</a>
    </div>
  `).join('')

  try {
    const { error } = await resend.emails.send({
      from: 'Harmuni Task <noreply@harmuni.org>',
      to: [to],
      subject: `${emoji} تذكير: لديك ${items.length} ${typeLabel}`,
      html: `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div style="text-align: center; padding: 30px 0;">
      <div style="display: inline-block; width: 60px; height: 60px; background: linear-gradient(135deg, #f59e0b, #ef4444); border-radius: 16px; line-height: 60px; color: white; font-size: 28px;">
        ${emoji}
      </div>
      <h1 style="color: #ffffff; font-size: 24px; margin: 20px 0 10px;">تذكير</h1>
      <p style="color: #94a3b8; margin: 0;">لديك ${items.length} ${typeLabel}</p>
    </div>

    <!-- Content Card -->
    <div style="background-color: #1e293b; border-radius: 16px; padding: 24px; border: 1px solid #334155;">
      <p style="color: #e2e8f0; font-size: 16px; margin: 0 0 20px;">
        مرحباً ${recipientName}،
      </p>

      <p style="color: #94a3b8; font-size: 14px; margin: 0 0 16px;">
        هذا تذكير بأن لديك ${items.length} ${itemLabel} ${isTask ? 'لم تكتمل بعد' : 'لم تقرأها بعد'}:
      </p>

      ${itemsHtml}

      <!-- CTA Button -->
      <a href="https://harmuni.org/dashboard" style="display: block; text-align: center; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-size: 16px; font-weight: 600; margin-top: 20px;">
        فتح التطبيق
      </a>
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding: 24px 0;">
      <p style="color: #64748b; font-size: 12px; margin: 0;">
        Harmuni Task - نظام إدارة المهام والتوزيع
      </p>
    </div>
  </div>
</body>
</html>
      `.trim()
    })

    if (error) {
      console.error('[Email] Reminder send error:', error)
      return { success: false, error: error.message }
    }

    console.log(`[Email] Reminder sent to ${to}`)
    return { success: true }

  } catch (error) {
    console.error('[Email] Reminder exception:', error)
    return { success: false, error: 'Failed to send reminder email' }
  }
}
