import { NextResponse } from 'next/server'

const CALENDAR_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json'

// In-memory cache to avoid 429 rate limits from the external API
let cachedEvents: unknown[] | null = null
let cacheTime = 0
const CACHE_DURATION_MS = 60 * 60 * 1000 // 1 hour

export async function GET() {
  const now = Date.now()
  if (cachedEvents !== null && now - cacheTime < CACHE_DURATION_MS) {
    return NextResponse.json(cachedEvents)
  }

  try {
    const response = await fetch(CALENDAR_URL, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 3600 }
    })
    if (!response.ok) {
      if (response.status === 429) {
        if (cachedEvents !== null) return NextResponse.json(cachedEvents)
        return NextResponse.json(
          { error: 'Rate limited', details: 'Calendar provider is rate limiting. Please try again in a few minutes.' },
          { status: 429 }
        )
      }
      throw new Error(`Calendar API returned ${response.status}`)
    }
    const data = await response.json()
    const events = Array.isArray(data) ? data : []
    cachedEvents = events
    cacheTime = now
    return NextResponse.json(events)
  } catch (error) {
    if (cachedEvents !== null) {
      return NextResponse.json(cachedEvents)
    }
    console.error('Error fetching economic calendar:', error)
    return NextResponse.json(
      { error: 'Failed to fetch economic calendar', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
