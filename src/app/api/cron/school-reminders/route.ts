import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase-admin'
// Note: We can't import from '@/app/school/_shared' in API routes due to 'use client'
// So we'll duplicate the necessary functions here

function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

function getClassesForDate(classes: any[], date: Date): any[] {
  const dateStr = formatLocalDate(date)
  const weekday = date.getDay() as Weekday
  
  return classes.filter(c => {
    // Check if class is on this weekday
    const weekdays = c.weekdays || (c.weekday !== undefined ? [c.weekday] : [])
    if (!weekdays.includes(weekday)) return false
    
    // Check if date is within semester
    if (dateStr < c.semesterStart || dateStr > c.semesterEnd) return false
    
    return true
  }).sort((a, b) => a.startTime.localeCompare(b.startTime))
}

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`

// Verify the request is from Vercel Cron
function verifyCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  return authHeader === `Bearer ${process.env.CRON_SECRET}`
}

// Helper to parse time string (HH:MM) to minutes
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + minutes
}

// Helper to format minutes to time string
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
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

    const db = getAdminFirestore()
    const now = new Date()
    const currentTime = now.getHours() * 60 + now.getMinutes() // Current time in minutes
    const today = formatLocalDate(now)
    const tomorrow = formatLocalDate(new Date(now.getTime() + 24 * 60 * 60 * 1000))
    
    // Get all users with notifications enabled
    const settingsSnapshot = await db.collection('notificationSettings')
      .where('enabled', '==', true)
      .get()

    if (settingsSnapshot.empty) {
      return NextResponse.json({ 
        message: 'No users with notifications enabled',
        sent: 0 
      })
    }

    const messages = []
    let successCount = 0
    let errorCount = 0

    // Process each user
    for (const settingsDoc of settingsSnapshot.docs) {
      const userId = settingsDoc.id
      const settings = settingsDoc.data()
      const chatId = settings.chatId

      if (!chatId) {
        console.warn(`User ${userId} has notifications enabled but no chat ID`)
        continue
      }

      // Get user's notification preferences (defaults)
      const classReminderMinutes = settings.classReminderMinutes ?? 15 // Default 15 minutes before
      const assignmentReminderDays = settings.assignmentReminderDays ?? [1, 0] // Default 1 day before and on the day
      const classNotificationsEnabled = settings.classNotificationsEnabled !== false // Default true
      const assignmentNotificationsEnabled = settings.assignmentNotificationsEnabled !== false // Default true

      const notifications: string[] = []

      try {
        // Check for classes today
        if (classNotificationsEnabled) {
          const classesSnapshot = await db.collection('schoolClasses')
            .where('userId', '==', userId)
            .get()

          const allClasses = classesSnapshot.docs.map(doc => {
            const data = doc.data()
            return {
              id: doc.id,
              ...data,
              weekdays: data.weekdays || (data.weekday !== undefined ? [data.weekday] : []),
            }
          })

          const classesToday = getClassesForDate(allClasses, now)

          for (const classItem of classesToday) {
            const classStartMinutes = timeToMinutes(classItem.startTime)
            const reminderTime = classStartMinutes - classReminderMinutes

            // Check if we're within the reminder window (within 5 minutes of reminder time)
            if (Math.abs(currentTime - reminderTime) <= 5) {
              const daysStr = classItem.weekdays
                .sort((a: number, b: number) => a - b)
                .map((w: number) => {
                  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                  return weekdays[w]
                })
                .join(', ')

              let classMsg = `📚 <b>Class Reminder</b>\n\n`
              classMsg += `<b>${classItem.title}</b>\n`
              classMsg += `⏰ Starts at ${classItem.startTime}\n`
              if (classItem.room) classMsg += `📍 Room: ${classItem.room}\n`
              if (classItem.teacher) classMsg += `👤 Teacher: ${classItem.teacher}\n`
              classMsg += `\nClass is starting in ${classReminderMinutes} minutes!`

              notifications.push(classMsg)
            }
          }
        }

        // Check for assignments due today or tomorrow
        if (assignmentNotificationsEnabled) {
          const assignmentsSnapshot = await db.collection('schoolAssignments')
            .where('userId', '==', userId)
            .where('status', '==', 'pending')
            .get()

          for (const assignmentDoc of assignmentsSnapshot.docs) {
            const assignment = assignmentDoc.data()
            const dueDate = assignment.dueDate

            if (!dueDate) continue

            // Check if due today
            if (dueDate === today && assignmentNotificationsEnabled) {
              const dueTime = assignment.dueTime || '23:59'
              let assignmentMsg = `📝 <b>Assignment Due Today</b>\n\n`
              assignmentMsg += `<b>${assignment.title}</b>\n`
              if (assignment.course) assignmentMsg += `📖 Course: ${assignment.course}\n`
              assignmentMsg += `⏰ Due: ${dueTime}\n`
              if (assignment.notes) assignmentMsg += `\n📄 ${assignment.notes}\n`
              assignmentMsg += `\nDon't forget to submit!`

              notifications.push(assignmentMsg)
            }
            // Check if due tomorrow (1 day reminder)
            else if (dueDate === tomorrow && assignmentReminderDays.includes(1)) {
              let assignmentMsg = `📝 <b>Assignment Reminder</b>\n\n`
              assignmentMsg += `<b>${assignment.title}</b>\n`
              if (assignment.course) assignmentMsg += `📖 Course: ${assignment.course}\n`
              assignmentMsg += `📅 Due: Tomorrow (${dueDate})\n`
              if (assignment.dueTime) assignmentMsg += `⏰ Time: ${assignment.dueTime}\n`
              assignmentMsg += `\nThis assignment is due tomorrow!`

              notifications.push(assignmentMsg)
            }
          }
        }

        // Send all notifications for this user
        if (notifications.length > 0) {
          for (const notification of notifications) {
            try {
              const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  chat_id: chatId,
                  text: notification,
                  parse_mode: 'HTML',
                }),
              })

              const data = await response.json()

              if (response.ok && data.ok) {
                successCount++
                messages.push({ userId, type: 'success', message: 'Sent' })
              } else {
                errorCount++
                messages.push({ 
                  userId, 
                  type: 'error', 
                  error: data.description || 'Failed to send'
                })
                console.error(`Failed to send to ${userId}:`, data.description)
              }
            } catch (error) {
              errorCount++
              messages.push({ 
                userId, 
                type: 'error', 
                error: error instanceof Error ? error.message : 'Unknown error'
              })
              console.error(`Error sending to ${userId}:`, error)
            }
          }
        }

      } catch (error) {
        console.error(`Error processing user ${userId}:`, error)
        errorCount++
        messages.push({ 
          userId, 
          type: 'error', 
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      sent: successCount,
      errors: errorCount,
      total: settingsSnapshot.size,
      messages
    })
  } catch (error) {
    console.error('Error in school reminders cron:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

