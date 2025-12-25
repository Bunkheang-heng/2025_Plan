import { NextResponse } from 'next/server'

// Unified data interface
interface GoldPriceData {
  price: number
  open?: number
  high24h?: number
  low24h?: number
  change24h?: number
  changePercent24h?: number
  volume?: number
  bid?: number
  ask?: number
  timestamp: string
  source: string
  isMock?: boolean
}

// You can use multiple APIs - I'll show examples for each

// Option 1: Alpha Vantage (Free - 25 requests/day, good for forex)
async function fetchFromAlphaVantage(): Promise<GoldPriceData | null> {
  const API_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'demo'
  const url = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=XAU&to_currency=USD&apikey=${API_KEY}`
  
  try {
    const response = await fetch(url, { 
      next: { revalidate: 60 } // Cache for 60 seconds
    })
    const data = await response.json()
    
    if (data['Realtime Currency Exchange Rate']) {
      const rate = data['Realtime Currency Exchange Rate']
      const price = parseFloat(rate['5. Exchange Rate'])
      const bid = parseFloat(rate['8. Bid Price'])
      const ask = parseFloat(rate['9. Ask Price'])
      
      return {
        price,
        bid,
        ask,
        open: price,
        high24h: price + 10,
        low24h: price - 10,
        change24h: 0,
        changePercent24h: 0,
        timestamp: rate['6. Last Refreshed'],
        source: 'Alpha Vantage'
      }
    }
  } catch (error) {
    console.error('Alpha Vantage error:', error)
  }
  return null
}

// Option 2: Twelve Data (Free tier - 800 requests/day)
async function fetchFromTwelveData(): Promise<GoldPriceData | null> {
  const API_KEY = process.env.TWELVE_DATA_API_KEY
  if (!API_KEY) return null
  
  const url = `https://api.twelvedata.com/quote?symbol=XAU/USD&apikey=${API_KEY}`
  
  try {
    const response = await fetch(url, {
      next: { revalidate: 60 }
    })
    const data = await response.json()
    
    if (data.close) {
      return {
        price: parseFloat(data.close),
        open: parseFloat(data.open),
        high24h: parseFloat(data.high),
        low24h: parseFloat(data.low),
        change24h: parseFloat(data.change),
        changePercent24h: parseFloat(data.percent_change),
        volume: data.volume ? parseInt(data.volume) : 0,
        timestamp: data.datetime,
        source: 'Twelve Data'
      }
    }
  } catch (error) {
    console.error('Twelve Data error:', error)
  }
  return null
}

// Option 3: Metals-API.com (Free tier - 50 requests/month)
async function fetchFromMetalsAPI(): Promise<GoldPriceData | null> {
  const API_KEY = process.env.METALS_API_KEY
  if (!API_KEY) return null
  
  const url = `https://metals-api.com/api/latest?access_key=${API_KEY}&base=USD&symbols=XAU`
  
  try {
    const response = await fetch(url, {
      next: { revalidate: 3600 } // Cache for 1 hour (free tier is limited)
    })
    const data = await response.json()
    
    if (data.success && data.rates?.XAU) {
      // Metals API returns inverse (USD per oz), we need to convert
      const pricePerOz = 1 / data.rates.XAU
      return {
        price: pricePerOz,
        open: pricePerOz,
        high24h: pricePerOz + 10,
        low24h: pricePerOz - 10,
        timestamp: new Date(data.timestamp * 1000).toISOString(),
        source: 'Metals API'
      }
    }
  } catch (error) {
    console.error('Metals API error:', error)
  }
  return null
}

// Option 4: Fallback to mock data with realistic variations
function generateMockData(): GoldPriceData {
  const basePrice = 2045.85
  const variation = (Math.random() - 0.5) * 10 // Random variation ±5
  const price = basePrice + variation
  const open = price - (Math.random() * 5)
  const change = price - open
  
  return {
    price: parseFloat(price.toFixed(2)),
    change24h: parseFloat(change.toFixed(2)),
    changePercent24h: parseFloat(((change / open) * 100).toFixed(2)),
    high24h: parseFloat((price + Math.random() * 8).toFixed(2)),
    low24h: parseFloat((price - Math.random() * 8).toFixed(2)),
    open: parseFloat(open.toFixed(2)),
    volume: Math.floor(150000 + Math.random() * 20000),
    timestamp: new Date().toISOString(),
    source: 'Mock Data (Demo Mode)',
    isMock: true
  }
}

export async function GET() {
  try {
    // Try each API in order
    let data = await fetchFromAlphaVantage()
    
    if (!data) {
      data = await fetchFromTwelveData()
    }
    
    if (!data) {
      data = await fetchFromMetalsAPI()
    }
    
    // If all APIs fail or no keys configured, use mock data
    if (!data) {
      console.log('Using mock data - configure API keys for real data')
      data = generateMockData()
    }
    
    // Calculate additional fields if not present
    if (!data.high24h && data.price) {
      const mockVariation = data.price * 0.008 // 0.8% variation
      data.high24h = data.price + mockVariation
      data.low24h = data.price - mockVariation
      data.open = data.price - (data.change24h || 0)
    }
    
    return NextResponse.json({
      success: true,
      data,
      message: data.source
    })
    
  } catch (error) {
    console.error('Error fetching gold price:', error)
    
    // Return mock data on error
    return NextResponse.json({
      success: true,
      data: generateMockData(),
      message: 'Using mock data due to API error'
    })
  }
}

