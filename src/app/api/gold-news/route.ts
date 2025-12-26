import { NextResponse } from 'next/server'

interface NewsArticle {
  title?: string
  description?: string
  url?: string
  urlToImage?: string
  publishedAt?: string
  source?: {
    name?: string
  }
  category?: string
  relevance?: number
}

interface NewsApiResponse {
  status: string
  articles: NewsArticle[]
}

// Cache for storing news data
let cachedNews: NewsArticle[] | null = null
let cacheTime: number = 0
const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

export async function GET() {
  try {
    // Check if we have cached data that's still valid
    const now = Date.now()
    if (cachedNews && (now - cacheTime) < CACHE_DURATION) {
      return NextResponse.json({ 
        articles: cachedNews,
        cached: true,
        nextUpdate: new Date(cacheTime + CACHE_DURATION).toISOString()
      })
    }

    // NewsAPI key - you'll need to get this from https://newsapi.org
    const apiKey = process.env.NEWS_API_KEY || 'YOUR_API_KEY_HERE'
    
    // Keywords relevant to gold trading
    const keywords = [
      'gold price',
      'gold market',
      'precious metals',
      'inflation',
      'federal reserve',
      'interest rates',
      'dollar',
      'XAU'
    ].join(' OR ')

    // Fetch from NewsAPI
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(keywords)}&language=en&sortBy=publishedAt&pageSize=50&apiKey=${apiKey}`
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`NewsAPI error: ${response.status}`)
    }

    const data = await response.json() as NewsApiResponse

    if (data.status !== 'ok') {
      throw new Error('NewsAPI returned error status')
    }

    // Filter and categorize articles
    const categorizedArticles = data.articles.map((article: NewsArticle) => {
      const title = (article.title || '').toLowerCase()
      const description = (article.description || '').toLowerCase()
      const content = title + ' ' + description

      // Determine category based on keywords
      let category = 'Market News'
      if (content.includes('inflation') || content.includes('cpi') || content.includes('pce')) {
        category = 'Inflation'
      } else if (content.includes('federal reserve') || content.includes('fed') || content.includes('interest rate') || content.includes('powell')) {
        category = 'Federal Reserve'
      } else if (content.includes('war') || content.includes('conflict') || content.includes('tension') || content.includes('geopolit')) {
        category = 'Geopolitical'
      } else if (content.includes('dollar') || content.includes('usd') || content.includes('currency')) {
        category = 'Currency'
      } else if (content.includes('gold') || content.includes('precious metal') || content.includes('xau')) {
        category = 'Gold'
      }

      return {
        ...article,
        category,
        relevance: calculateRelevance(content)
      }
    })

    // Sort by relevance and date
    const sortedArticles = categorizedArticles
      .filter((article: NewsArticle) => (article.relevance ?? 0) > 0)
      .sort((a: NewsArticle, b: NewsArticle) => {
        const aRelevance = a.relevance ?? 0
        const bRelevance = b.relevance ?? 0
        if (aRelevance !== bRelevance) {
          return bRelevance - aRelevance
        }
        const aDate = a.publishedAt ? new Date(a.publishedAt).getTime() : 0
        const bDate = b.publishedAt ? new Date(b.publishedAt).getTime() : 0
        return bDate - aDate
      })
      .slice(0, 30) // Limit to 30 most relevant articles

    // Update cache
    cachedNews = sortedArticles
    cacheTime = now

    return NextResponse.json({ 
      articles: sortedArticles,
      cached: false,
      nextUpdate: new Date(now + CACHE_DURATION).toISOString()
    })

  } catch (error) {
    console.error('Error fetching gold news:', error)
    return NextResponse.json(
      { error: 'Failed to fetch gold news', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Calculate relevance score based on gold-related keywords
function calculateRelevance(content: string): number {
  let score = 0
  
  // High priority keywords
  if (content.includes('gold price') || content.includes('gold market')) score += 10
  if (content.includes('xau')) score += 8
  if (content.includes('precious metal')) score += 7
  
  // Medium priority keywords
  if (content.includes('gold')) score += 5
  if (content.includes('inflation')) score += 4
  if (content.includes('federal reserve') || content.includes('fed ')) score += 4
  if (content.includes('interest rate')) score += 4
  
  // Lower priority but still relevant
  if (content.includes('dollar') || content.includes('usd')) score += 2
  if (content.includes('recession')) score += 3
  if (content.includes('geopolit') || content.includes('war') || content.includes('conflict')) score += 3
  
  return score
}

