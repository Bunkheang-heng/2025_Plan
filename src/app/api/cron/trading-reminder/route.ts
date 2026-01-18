import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase-admin'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`

// Verify the request is from Vercel Cron (optional but recommended)
function verifyCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  return authHeader === `Bearer ${process.env.CRON_SECRET}`
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret if provided
    if (process.env.CRON_SECRET && !verifyCronRequest(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!TELEGRAM_BOT_TOKEN) {
      console.error('Telegram bot token not configured')
      return NextResponse.json(
        { error: 'Telegram bot token not configured. Set TELEGRAM_BOT_TOKEN in your deployment environment.' },
        { status: 500 }
      )
    }

    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      console.error('FIREBASE_SERVICE_ACCOUNT not configured for Firebase Admin SDK')
      return NextResponse.json(
        {
          error: 'Firebase Admin not configured. Set FIREBASE_SERVICE_ACCOUNT in your deployment environment.'
        },
        { status: 500 }
      )
    }

    const db = getAdminFirestore()
    
    // Get all users with notifications enabled
    const snapshot = await db.collection('notificationSettings')
      .where('enabled', '==', true)
      .get()

    if (snapshot.empty) {
      return NextResponse.json({ 
        message: 'No users with notifications enabled',
        sent: 0 
      })
    }

    const messages = []
    let successCount = 0
    let errorCount = 0

    // Send reminder to each user
    const now = Date.now()
    
    for (const docSnap of snapshot.docs) {
      const settings = docSnap.data()
      const chatId = settings.chatId

      if (!chatId) {
        console.warn(`User ${docSnap.id} has notifications enabled but no chat ID`)
        continue
      }

      // Get user's custom interval (default: 30 minutes)
      const intervalMinutes = settings.tradingReminderMinutes || 30
      const intervalMs = intervalMinutes * 60 * 1000

      // Check if it's time to send a reminder
      const lastReminder = settings.lastReminder ? Date.parse(settings.lastReminder) : null
      const timeSinceLastReminder = lastReminder ? now - lastReminder : Infinity

      // Only send if enough time has passed since last reminder
      if (timeSinceLastReminder < intervalMs) {
        // Not time yet, skip this user
        continue
      }

      const defaultMessage = `⏰ <b>Trading Reminder</b>\n\nTime to stop trading! Take a break and review your strategy.\n\nRemember: Discipline is key to successful trading.`
      const reminderMessageRaw =
        typeof settings.messageTemplate === 'string' && settings.messageTemplate.trim().length > 0
          ? settings.messageTemplate.trim()
          : defaultMessage
      // Telegram message limit is 4096 chars; keep margin for safety.
      const reminderMessage = reminderMessageRaw.length > 4000
        ? `${reminderMessageRaw.slice(0, 3997)}...`
        : reminderMessageRaw

      try {
        const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: chatId,
            text: reminderMessage,
            parse_mode: 'HTML',
          }),
        })

        const data = await response.json()

        if (response.ok && data.ok) {
          successCount++
          messages.push({ userId: docSnap.id, status: 'success' })
          
          // Update last reminder timestamp
          const settingsRef = db.collection('notificationSettings').doc(docSnap.id)
          await settingsRef.update({
            lastReminder: new Date().toISOString()
          })
        } else {
          errorCount++
          messages.push({ 
            userId: docSnap.id, 
            status: 'error', 
            error: data.description 
          })
          console.error(`Failed to send to ${docSnap.id}:`, data.description)
        }
      } catch (error) {
        errorCount++
        messages.push({ 
          userId: docSnap.id, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        console.error(`Error sending to ${docSnap.id}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      sent: successCount,
      errors: errorCount,
      total: snapshot.size,
      messages
    })
  } catch (error) {
    console.error('Error in trading reminder cron:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

