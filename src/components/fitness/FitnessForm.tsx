'use client'
import React, { useState } from 'react'
import { Button, Input, Select } from '@/components'

interface FitnessFormProps {
  onSubmit: (preferences: FitnessPreferences) => void
  isLoading: boolean
}

export interface FitnessPreferences {
  fitnessLevel: string
  goals: string
  workoutDays: number
  name: string
  age: string
  occupation: string
  currentWeight: string
  height: string
  currentPhase: string
  dietaryRestrictions: string
  mealPreferences: string
  equipmentAccess: string
  timeAvailable: string
  allergies: string
  additionalNotes: string
}

export function FitnessForm({ onSubmit, isLoading }: FitnessFormProps) {
  const [preferences, setPreferences] = useState<FitnessPreferences>({
    fitnessLevel: 'intermediate',
    goals: 'weight_loss',
    workoutDays: 5,
    name: 'HENG Bunkheang',
    age: '21',
    occupation: 'IT Student',
    currentWeight: '72',
    height: '175',
    currentPhase: 'cut',
    dietaryRestrictions: 'none',
    mealPreferences: 'balanced',
    equipmentAccess: 'gym',
    timeAvailable: '60',
    allergies: '',
    additionalNotes: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(preferences)
  }

  const handleInputChange = (field: keyof FitnessPreferences, value: string | number) => {
    setPreferences(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <div className="bg-gray-800/50 border border-gray-600/30 rounded-lg p-6 backdrop-blur-sm">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
        <span className="mr-3">⚙️</span>
        Your Preferences
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Fitness Level */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Fitness Level
          </label>
          <Select
            value={preferences.fitnessLevel}
            onChange={(e) => handleInputChange('fitnessLevel', e.target.value)}
            options={[
              { value: 'beginner', label: 'Beginner' },
              { value: 'intermediate', label: 'Intermediate' },
              { value: 'advanced', label: 'Advanced' }
            ]}
          />
        </div>

        {/* Goals */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Primary Goal
          </label>
          <Select
            value={preferences.goals}
            onChange={(e) => handleInputChange('goals', e.target.value)}
            options={[
              { value: 'weight_loss', label: 'Weight Loss' },
              { value: 'muscle_gain', label: 'Muscle Gain' },
              { value: 'strength', label: 'Strength Building' },
              { value: 'endurance', label: 'Endurance' },
              { value: 'general_fitness', label: 'General Fitness' }
            ]}
          />
        </div>

        {/* Workout Days */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Workout Days per Week
          </label>
          <Select
            value={preferences.workoutDays.toString()}
            onChange={(e) => handleInputChange('workoutDays', parseInt(e.target.value))}
            options={[
              { value: '3', label: '3 Days' },
              { value: '4', label: '4 Days' },
              { value: '5', label: '5 Days' },
              { value: '6', label: '6 Days' },
              { value: '7', label: '7 Days' }
            ]}
          />
        </div>

        {/* Current Stats Section */}
        <div className="border-t border-gray-600/30 pt-6">
          <h3 className="text-lg font-semibold text-emerald-400 mb-4 flex items-center">
            <span className="mr-2">📊</span>
            Personal Information
          </h3>
          
          {/* Personal Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Full Name
              </label>
              <Input
                type="text"
                value={preferences.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="HENG Bunkheang"
              />
            </div>

            {/* Age */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Age
              </label>
              <Input
                type="number"
                value={preferences.age}
                onChange={(e) => handleInputChange('age', e.target.value)}
                placeholder="21"
                min="16"
                max="80"
              />
            </div>

            {/* Occupation */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Occupation
              </label>
              <Input
                type="text"
                value={preferences.occupation}
                onChange={(e) => handleInputChange('occupation', e.target.value)}
                placeholder="IT Student"
              />
            </div>
          </div>
          
          {/* Physical Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Current Weight */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Current Weight (kg)
              </label>
              <Input
                type="number"
                value={preferences.currentWeight}
                onChange={(e) => handleInputChange('currentWeight', e.target.value)}
                placeholder="72"
                min="30"
                max="200"
              />
            </div>

            {/* Height */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Height (cm)
              </label>
              <Input
                type="number"
                value={preferences.height}
                onChange={(e) => handleInputChange('height', e.target.value)}
                placeholder="175"
                min="120"
                max="250"
              />
            </div>
          </div>

          {/* Current Phase */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Current Phase
            </label>
            <Select
              value={preferences.currentPhase}
              onChange={(e) => handleInputChange('currentPhase', e.target.value)}
              options={[
                { value: 'cut', label: '🔥 Cut (Fat Loss)' },
                { value: 'bulk', label: '💪 Bulk (Muscle Gain)' },
                { value: 'maintain', label: '⚖️ Maintain (Body Recomposition)' }
              ]}
            />
          </div>
        </div>

        {/* Equipment Access */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Equipment Access
          </label>
          <Select
            value={preferences.equipmentAccess}
            onChange={(e) => handleInputChange('equipmentAccess', e.target.value)}
            options={[
              { value: 'gym', label: 'Full Gym Access' },
              { value: 'home_basic', label: 'Home (Basic Equipment)' },
              { value: 'home_advanced', label: 'Home (Advanced Equipment)' },
              { value: 'bodyweight', label: 'Bodyweight Only' }
            ]}
          />
        </div>

        {/* Time Available */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Time per Workout (minutes)
          </label>
          <Select
            value={preferences.timeAvailable}
            onChange={(e) => handleInputChange('timeAvailable', e.target.value)}
            options={[
              { value: '30', label: '30 minutes' },
              { value: '45', label: '45 minutes' },
              { value: '60', label: '60 minutes' },
              { value: '90', label: '90 minutes' },
              { value: '120', label: '2+ hours' }
            ]}
          />
        </div>

        {/* Dietary Restrictions */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Dietary Restrictions
          </label>
          <Select
            value={preferences.dietaryRestrictions}
            onChange={(e) => handleInputChange('dietaryRestrictions', e.target.value)}
            options={[
              { value: 'none', label: 'No Restrictions' },
              { value: 'vegetarian', label: 'Vegetarian' },
              { value: 'vegan', label: 'Vegan' },
              { value: 'keto', label: 'Keto' },
              { value: 'paleo', label: 'Paleo' },
              { value: 'gluten_free', label: 'Gluten Free' },
              { value: 'dairy_free', label: 'Dairy Free' }
            ]}
          />
        </div>

        {/* Meal Preferences */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Meal Style
          </label>
          <Select
            value={preferences.mealPreferences}
            onChange={(e) => handleInputChange('mealPreferences', e.target.value)}
            options={[
              { value: 'balanced', label: 'Balanced' },
              { value: 'high_protein', label: 'High Protein' },
              { value: 'low_carb', label: 'Low Carb' },
              { value: 'mediterranean', label: 'Mediterranean' },
              { value: 'clean_eating', label: 'Clean Eating' }
            ]}
          />
        </div>

        {/* Allergies */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Allergies (optional)
          </label>
          <Input
            value={preferences.allergies}
            onChange={(e) => handleInputChange('allergies', e.target.value)}
            placeholder="e.g., nuts, shellfish, eggs..."
          />
        </div>

        {/* Additional Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Additional Notes (optional)
          </label>
          <textarea
            value={preferences.additionalNotes}
            onChange={(e) => handleInputChange('additionalNotes', e.target.value)}
            placeholder="Any other preferences or requirements..."
            className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            rows={3}
          />
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50"
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating Plan...
            </div>
          ) : (
            '🚀 Generate My Plan'
          )}
        </Button>
      </form>
    </div>
  )
} 