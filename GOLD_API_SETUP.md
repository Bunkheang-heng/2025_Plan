# Gold Market Real-Time Data Setup

Your gold market information page now fetches **REAL-TIME data** from multiple sources. Here's how to set it up:

## 🚀 Quick Start (Currently Working)

The app is currently using **mock data** with realistic variations. This works immediately without any setup!

To get **real-time data**, follow the steps below to configure API keys.

---

## 📊 Supported Data Sources

### Option 1: Alpha Vantage (Recommended for Starting)
- **Free Tier**: 25 API requests per day
- **Coverage**: Forex, Stocks, Crypto, Commodities  
- **Best For**: Testing and small projects

#### How to Get API Key:
1. Go to: https://www.alphavantage.co/support/#api-key
2. Enter your email address
3. Click "GET FREE API KEY"
4. Copy your API key (looks like: `ABC123XYZ`)

#### Setup:
Add to your `.env.local` file:
```bash
ALPHA_VANTAGE_API_KEY=your_api_key_here
```

---

### Option 2: Twelve Data (Best for Production)
- **Free Tier**: 800 API requests per day
- **Coverage**: Stocks, Forex, Crypto, ETFs
- **Best For**: Production applications with moderate traffic

#### How to Get API Key:
1. Go to: https://twelvedata.com/
2. Click "Get API Key" or "Sign Up"
3. Create a free account
4. Navigate to your dashboard to find your API key

#### Setup:
Add to your `.env.local` file:
```bash
TWELVE_DATA_API_KEY=your_api_key_here
```

---

### Option 3: Metals-API (Specialized)
- **Free Tier**: 50 API requests per month
- **Coverage**: Precious metals (Gold, Silver, Platinum, etc.)
- **Best For**: If you only need metals data and want high accuracy

#### How to Get API Key:
1. Go to: https://metals-api.com/
2. Click "Get Free API Key"
3. Sign up for a free account
4. Find your API key in the dashboard

#### Setup:
Add to your `.env.local` file:
```bash
METALS_API_KEY=your_api_key_here
```

---

## ⚙️ Complete Setup Instructions

### Step 1: Create Environment File

In your project root, create a file named `.env.local`:

```bash
# Alpha Vantage (choose one or more)
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key

# Twelve Data  
TWELVE_DATA_API_KEY=your_twelve_data_key

# Metals API
METALS_API_KEY=your_metals_api_key
```

### Step 2: Restart Your Development Server

After adding API keys:

```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
```

### Step 3: Verify It's Working

1. Open: http://localhost:3000/trading/gold_info
2. Look for the data source badge at the top
3. You should see one of:
   - "📡 Alpha Vantage"
   - "📡 Twelve Data"
   - "📡 Metals API"
   
   Instead of: "📡 Mock Data (Demo Mode)"

---

## 🔄 How the Auto-Fallback Works

The system tries APIs in this order:

1. **Alpha Vantage** → If key exists and working
2. **Twelve Data** → If Alpha Vantage fails
3. **Metals API** → If both above fail
4. **Mock Data** → If all APIs fail or no keys configured

This means you can configure just ONE API and it will work!

---

## 🎯 Recommended Setup

### For Development/Testing:
```bash
# Just use Alpha Vantage (easiest to get)
ALPHA_VANTAGE_API_KEY=your_key_here
```

### For Production:
```bash
# Use Twelve Data (more requests)
TWELVE_DATA_API_KEY=your_key_here

# Optional: Add Alpha Vantage as backup
ALPHA_VANTAGE_API_KEY=your_key_here
```

---

## 📈 Features Working Real-Time

Once configured, these update every 60 seconds:

- ✅ Current XAU/USD Price
- ✅ 24h High/Low
- ✅ Price Change & Percentage
- ✅ Opening Price
- ✅ Trading Volume
- ✅ Live Timestamp

---

## 🔍 Troubleshooting

### "Mock Data (Demo Mode)" Still Showing

**Cause**: API keys not configured or invalid

**Solution**:
1. Check `.env.local` file exists in project root
2. Verify API key is correct (no spaces, quotes not needed)
3. Restart the dev server: `npm run dev`

### API Request Limits

If you hit rate limits:

**Alpha Vantage (25/day)**:
- Solution: Sign up for Twelve Data (800/day)
- Or: Add multiple API keys and rotate

**Twelve Data (800/day)**:
- This should be enough for most applications
- If needed, upgrade to paid tier

### Data Not Updating

1. Check browser console for errors (F12 → Console)
2. Check terminal for API errors
3. Verify your internet connection
4. Check if API service is down: https://status.twelvedata.com/

---

## 💡 Pro Tips

1. **Use Multiple APIs**: Configure all three for maximum uptime
2. **Monitor Usage**: Check your API dashboard regularly
3. **Cache Wisely**: The app caches data for 60 seconds to save requests
4. **Weekend Trading**: Gold markets are closed on weekends, data may be stale

---

## 📚 Additional Resources

- **Alpha Vantage Docs**: https://www.alphavantage.co/documentation/
- **Twelve Data Docs**: https://twelvedata.com/docs
- **Metals-API Docs**: https://metals-api.com/documentation

---

## 🎨 Customization

### Change Update Frequency

In `src/app/trading/gold_info/page.tsx`:

```typescript
// Change from 60000 (1 minute) to your preferred interval
const interval = setInterval(() => {
  fetchGoldPrice()
}, 30000) // 30 seconds (30000ms)
```

### Change API Priority

In `src/app/api/gold-price/route.ts`, reorder the API calls:

```typescript
// Try Twelve Data first
let data = await fetchFromTwelveData()

if (!data) {
  data = await fetchFromAlphaVantage()
}
```

---

## 🎉 You're All Set!

Your gold trading page now has **real-time market data**! 

Start with Alpha Vantage (easiest), then upgrade to Twelve Data when you need more requests.

Happy Trading! 📈✨

