import { NextResponse } from 'next/server'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`

export async function GET() {
  try {
    if (!TELEGRAM_BOT_TOKEN) {
      return NextResponse.json(
        { error: 'Telegram bot token not configured' },
        { status: 500 }
      )
    }

    const response = await fetch(`${TELEGRAM_API_URL}/getMe`)
    const data = await response.json()

    if (!response.ok || !data.ok) {
      return NextResponse.json(
        { error: 'Failed to get bot info' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      username: data.result.username,
      firstName: data.result.first_name,
      id: data.result.id
    })
  } catch (error) {
    console.error('Error getting bot info:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

