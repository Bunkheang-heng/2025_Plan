# Gemini AI Integration Setup Guide

This guide will help you set up Gemini AI integration for your productivity planner app.

## 🚀 Quick Start

### 1. Get Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API key"
4. Copy your API key

### 2. Configure Environment Variables

1. Create or update your `.env.local` file in the project root:

```bash
# Copy from .env.local.example
cp .env.local.example .env.local
```

2. Add your Gemini API key:

```bash
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

### 3. Install and Run

The chat functionality is already integrated! Just start your development server:

```bash
npm run dev
```

Visit `http://localhost:3000/chat` or click "AI Chat" in the navigation.

## 🤖 Features

### Chat Interface
- **Clean, modern chat UI** with user and AI message bubbles
- **Real-time plan context** - Gemini knows about your current plans
- **Quick action buttons** for common productivity questions
- **Auto-scrolling messages** with timestamps
- **Loading states** with animated typing indicators

### AI Capabilities
Gemini can help you with:
- **Progress analysis** - "What's my progress today?"
- **Priority recommendations** - "What should I focus on next?"
- **Time management advice** - Personalized tips based on your data
- **Goal suggestions** - Ideas for new plans and improvements
- **Weekly/monthly reviews** - Comprehensive progress summaries

### Plan Context Integration
The AI has access to:
- All your daily, weekly, and monthly plans
- Completion statistics
- Task priorities and statuses
- Current date and time context
- Plan descriptions and goals

## 🎯 Example Conversations

### Productivity Analysis
**You:** "How am I doing today?"
**AI:** Based on your current plans, you've completed 3 out of 5 daily tasks. Your priority tasks include... Here's what I recommend focusing on next...

### Time Management
**You:** "I'm feeling overwhelmed with my weekly goals"
**AI:** I can see you have 8 weekly goals with 3 marked as high priority. Let me help you create a manageable schedule...

### Goal Setting
**You:** "Suggest some improvements for my monthly plans"
**AI:** Looking at your current monthly goals, I notice you're strong in work tasks but could benefit from adding more self-care activities...

## 🔧 Customization

### Quick Actions
Edit `src/components/chat/QuickActions.tsx` to add your own frequently asked questions:

```typescript
const quickActions = [
  {
    icon: 'custom-icon',
    text: "Your custom question",
    message: "The full prompt sent to Gemini"
  }
  // ... more actions
]
```

### AI Personality
Modify the system prompt in `src/app/api/chat/route.ts`:

```typescript
text: `${contextPrompt}

User Question: ${message}

[Customize this prompt to change AI behavior]
Please provide a helpful, personalized response...`
```

### Plan Context
Adjust what data is sent to Gemini in `src/app/chat/page.tsx`:

```typescript
const planContext = {
  // Add or remove fields here
  stats,
  plans: plans.map(plan => ({
    // Customize what plan data to include
    id: plan.id,
    title: plan.title,
    // ... other fields
  }))
}
```

## 🔒 Security & Privacy

### API Key Protection
- Your API key is stored securely in environment variables
- Never exposed to the client-side code
- API calls are made server-side only

### Data Privacy
- Plan data is sent to Gemini for context but not stored
- Each conversation is independent
- No conversation history is saved by default

### Rate Limiting
The Gemini API has generous free tier limits:
- 15 requests per minute
- 1,500 requests per day
- 1 million tokens per minute

## 🐛 Troubleshooting

### "API key not configured" Error
1. Check your `.env.local` file exists
2. Verify the API key variable name: `GEMINI_API_KEY`
3. Restart your development server after adding the key

### "Failed to get response from Gemini" Error
1. Verify your API key is valid
2. Check your internet connection
3. Ensure you haven't exceeded rate limits

### Missing Plan Context
1. Make sure you're logged in
2. Verify you have some plans created (daily/weekly/monthly)
3. Check Firebase connection

### Chat Not Loading
1. Clear browser cache and cookies
2. Check browser console for errors
3. Verify all component imports are correct

## 📈 Performance Tips

### Optimize Plan Data
- Limit plan context to relevant recent data
- Consider pagination for users with many plans
- Cache plan data to reduce Firebase calls

### Message Management
- Consider adding message history limits
- Implement conversation cleanup for long chats
- Add message persistence if needed

## 🔄 Future Enhancements

### Suggested Features
1. **Conversation History** - Save and restore chat sessions
2. **Voice Integration** - Speech-to-text and text-to-speech
3. **Plan Actions** - Let AI create/update plans directly
4. **Smart Notifications** - AI-generated reminders
5. **Export Conversations** - Save important insights
6. **Multi-language Support** - Detect and respond in user's language

### Advanced Integrations
1. **Calendar Sync** - Include calendar events in context
2. **Goal Templates** - AI-generated plan templates
3. **Progress Predictions** - AI forecasting of goal completion
4. **Team Collaboration** - Shared AI assistant for teams

## 📞 Support

If you need help:
1. Check the console for error messages
2. Verify your environment setup
3. Test with simple questions first
4. Check Gemini API status and quotas

## 🎉 You're All Set!

Your AI productivity assistant is ready! Start chatting at `/chat` and let Gemini help you achieve your goals more effectively. 