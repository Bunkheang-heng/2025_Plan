import { NextRequest, NextResponse } from 'next/server'
import { getFirestore, collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore'
import { initializeApp, getApps } from 'firebase/app'

// Initialize Firebase if not already initialized
if (getApps().length === 0) {
  initializeApp({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  })
}

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
        { error: 'Telegram bot token not configured' },
        { status: 500 }
      )
    }

    const db = getFirestore()
    
    // Get all users with notifications enabled
    const settingsRef = collection(db, 'notificationSettings')
    const q = query(settingsRef, where('enabled', '==', true))
    const snapshot = await getDocs(q)

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
    for (const docSnap of snapshot.docs) {
      const settings = docSnap.data()
      const chatId = settings.chatId

      if (!chatId) {
        console.warn(`User ${docSnap.id} has notifications enabled but no chat ID`)
        continue
      }

      const reminderMessage = `⏰ <b>Trading Reminder</b>\n\nTime to stop trading! Take a break and review your strategy.\n\nRemember: Discipline is key to successful trading.`

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
          const settingsRef = doc(db, 'notificationSettings', docSnap.id)
          await updateDoc(settingsRef, {
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

