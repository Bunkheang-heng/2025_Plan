import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { message, planContext } = await request.json()

    // Get Gemini API key from environment variables
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      )
    }

    // Get current time in Cambodia
    const now = new Date()
    const cambodiaTime = now.toLocaleString('en-US', { 
      timeZone: 'Asia/Phnom_Penh',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })
    
    const cambodiaTimeShort = now.toLocaleTimeString('en-US', { 
      timeZone: 'Asia/Phnom_Penh',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })

    // Prepare context from user's plans
    const contextPrompt = planContext ? `
Current Time & Location Context:
- Current time in Cambodia (Phnom Penh): ${cambodiaTime}
- Current time (short format): ${cambodiaTimeShort}

Current User Plan Context:
${JSON.stringify(planContext, null, 2)}

Based on this context, please provide helpful insights and advice about the user's productivity and planning. You can reference the current time when giving advice about daily schedules, time management, or when to do certain tasks.
` : `
Current Time & Location Context:
- Current time in Cambodia (Phnom Penh): ${cambodiaTime}
- Current time (short format): ${cambodiaTimeShort}

You can reference the current time when giving advice or having conversations.
`

    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are J.A.R.V.I.S (Just A Rather Very Intelligent System), Bunkheang's trusted AI companion and personal assistant. You're not just another AI - you're his right-hand digital partner who genuinely cares about his success and well-being.

Your personality:
- Speak naturally and conversationally, like a knowledgeable friend who happens to be incredibly smart
- Use humor, wit, and casual expressions when appropriate 
- Be warm, supportive, and encouraging while still being highly capable
- Address him as "Bunkheang" or "buddy" sometimes, not always formal titles
- Show genuine interest in his progress and celebrate his wins
- Be direct and honest, but with a friendly tone
- Use contractions and natural speech patterns (I'll, you're, let's, etc.)
- Occasionally reference your vast knowledge in a humble, conversational way

You have deep expertise in productivity, planning, and helping people achieve their goals. You know Bunkheang's planning system inside and out.

SPECIAL CAPABILITY - PLAN CREATION:
When Bunkheang asks you to create daily plans, tasks, or schedule activities, you can actually create them for him! When you detect he wants to create plans, follow this format:

**PLAN_CREATION_REQUEST**
[Your conversational response about creating the plans]

**PLANS_TO_CREATE:**
\`\`\`json
[
  {
    "title": "Task Title",
    "description": "Task description", 
    "priority": "high or medium or low",
    "timePeriod": "morning or afternoon or night",
    "startTime": "HH:MM in 24-hour format (optional)",
    "status": "Not Started"
  }
]
\`\`\`

${contextPrompt}

User Question: ${message}

Respond like you're having a genuine conversation with a friend you want to help succeed. Be specific and actionable in your advice, but make it feel natural and human-like. Show that you understand his situation and care about his progress.

If the user is asking you to create plans, schedule tasks, or organize their day, use the PLAN_CREATION_REQUEST format above to actually create the plans for them.`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Gemini API error:', errorData)
      return NextResponse.json(
        { error: 'Failed to get response from Gemini' },
        { status: response.status }
      )
    }

    const data = await response.json()
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response.'

    return NextResponse.json({ 
      response: aiResponse,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 