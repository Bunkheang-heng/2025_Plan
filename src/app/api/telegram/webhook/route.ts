import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase-admin'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

export async function POST(request: NextRequest) {
  try {
    if (!TELEGRAM_BOT_TOKEN) {
      return NextResponse.json(
        { error: 'Telegram bot token not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const message = body.message

    if (!message) {
      return NextResponse.json({ ok: true })
    }

    const chatId = message.chat.id.toString()
    const text = message.text || ''
    // Extract userId from /start command - can be /start <userId> or from deep link parameter
    const commandParts = text.split(' ')
    const userId = commandParts.length > 1 ? commandParts[1] : null

    // Handle /start command
    if (text.startsWith('/start')) {
      if (userId) {
        // Save chat ID to Firestore using Admin SDK (bypasses security rules)
        try {
          const db = getAdminFirestore()
          const settingsRef = db.collection('notificationSettings').doc(userId)
          
          await settingsRef.set({
            chatId,
            updatedAt: new Date().toISOString()
          }, { merge: true })

          // Send confirmation message
          const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              chat_id: chatId,
              text: '✅ Successfully connected! Your trading reminders are now set up. You will receive notifications every 30 minutes when enabled.',
            }),
          })

          return NextResponse.json({ ok: true })
        } catch (error) {
          console.error('Error saving chat ID:', error)
          return NextResponse.json({ ok: true })
        }
      } else {
        // No userId provided, send instructions
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: chatId,
            text: '👋 Hello! To connect this bot to your account, please use the link from the notification settings page in the app.',
          }),
        })

        return NextResponse.json({ ok: true })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json({ ok: true }) // Always return ok to Telegram
  }
}

