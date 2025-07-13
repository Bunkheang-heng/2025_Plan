import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    const preferences = await request.json()
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
    
    const prompt = `You are an expert fitness trainer and nutritionist. Generate a comprehensive 7-day weekly fitness and meal plan for ${preferences.name}.

Personal Information:
- Name: ${preferences.name}
- Age: ${preferences.age} years old
- Occupation: ${preferences.occupation}
- Weight: ${preferences.currentWeight}kg
- Height: ${preferences.height}cm
- Current Phase: ${preferences.currentPhase}
- BMI: ${(parseFloat(preferences.currentWeight) / Math.pow(parseFloat(preferences.height) / 100, 2)).toFixed(1)}

Training & Nutrition Preferences:
- Fitness Level: ${preferences.fitnessLevel}
- Primary Goal: ${preferences.goals}
- Workout Days: ${preferences.workoutDays} per week
- Equipment Access: ${preferences.equipmentAccess}
- Time Available: ${preferences.timeAvailable} minutes per workout
- Dietary Restrictions: ${preferences.dietaryRestrictions}
- Meal Preferences: ${preferences.mealPreferences}
- Allergies: ${preferences.allergies || 'None'}
- Additional Notes: ${preferences.additionalNotes || 'None'}

Please respond with a JSON array containing exactly 7 objects, one for each day of the week. Each object should have the following structure:
{
  "day": (number 1-7),
  "dayName": (Monday, Tuesday, etc.),
  "workout": (detailed workout description including exercises, sets, reps, or rest day activities),
  "breakfast": (specific meal with portions/ingredients),
  "lunch": (specific meal with portions/ingredients),
  "snack": (specific snack with portions/ingredients),
  "dinner": (specific meal with portions/ingredients)
}

Guidelines:
- Make workouts appropriate for the fitness level and equipment access
- Include rest days or active recovery if workout days < 7
- Ensure meals align with dietary restrictions and preferences
- Include specific portions and ingredients for meals
- Consider the primary goal (weight loss, muscle gain, etc.) in both workouts and nutrition
- IMPORTANT: Customize based on current phase:
  * Cut: Higher protein, moderate carbs, lower calories, more cardio/HIIT
  * Bulk: Higher calories, balanced macros, focus on compound movements
  * Maintain: Balanced approach with body recomposition focus
- Calculate meal portions based on current weight and BMI
- Consider age and occupation for lifestyle recommendations:
  * Young adults (18-25): Higher recovery capacity, can handle more intense training
  * Students/IT workers: Include exercises for posture, eye strain relief, and stress management
  * Sedentary jobs: Focus on mobility, flexibility, and activation exercises
- Make sure each meal is balanced and practical
- If allergies are mentioned, completely avoid those ingredients
- Vary the workouts and meals throughout the week
- For cutting phase: Focus on fat loss while preserving muscle mass
- Address common concerns for IT students: good posture, wrist health, stress management

Return ONLY the JSON array, no additional text or formatting.`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    // Clean up the response to extract just the JSON
    let cleanedText = text.trim()
    
    // Remove markdown code blocks if present
    cleanedText = cleanedText.replace(/```json\n?/g, '')
    cleanedText = cleanedText.replace(/```\n?/g, '')
    
    // Try to parse the JSON
    let plan
    try {
      plan = JSON.parse(cleanedText)
    } catch {
      // If parsing fails, try to extract JSON from the text
      const jsonMatch = cleanedText.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        plan = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('Could not parse JSON from response')
      }
    }
    
    // Validate the plan structure
    if (!Array.isArray(plan) || plan.length !== 7) {
      throw new Error('Invalid plan format')
    }
    
    // Validate each day has required fields
    for (let i = 0; i < plan.length; i++) {
      const day = plan[i]
      if (!day.day || !day.dayName || !day.workout || !day.breakfast || !day.lunch || !day.snack || !day.dinner) {
        throw new Error(`Day ${i + 1} is missing required fields`)
      }
    }
    
    return NextResponse.json({ success: true, plan })
    
  } catch (error) {
    console.error('Error generating fitness plan:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to generate plan' 
      },
      { status: 500 }
    )
  }
} 