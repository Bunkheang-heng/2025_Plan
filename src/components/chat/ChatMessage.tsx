'use client'
import React from 'react'
import { Icon, Badge } from '../index'

interface ChatMessageProps {
  message: string
  isUser: boolean
  timestamp: Date
  isLoading?: boolean
  planReferences?: {
    id: string
    title: string
    type: 'daily' | 'weekly' | 'monthly'
  }[]
}

const formatMessage = (message: string) => {
  // First, handle bold text formatting
  const formatBoldText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g)
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const boldText = part.substring(2, part.length - 2)
        return <strong key={idx} className="font-bold text-yellow-400">{boldText}</strong>
      }
      return part
    })
  }

  // Split message into lines
  const lines = message.split('\n')
  const elements: React.ReactElement[] = []
  let currentList: string[] = []
  let elementIndex = 0
  
  const addCurrentList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`list-${elementIndex++}`} className="list-disc list-inside space-y-2 my-4 ml-4 text-gray-200">
          {currentList.map((item, i) => (
            <li key={i} className="text-sm leading-relaxed text-gray-200 marker:text-yellow-400">{formatBoldText(item.trim())}</li>
          ))}
        </ul>
      )
      currentList = []
    }
  }
  
  lines.forEach((line) => {
    const trimmedLine = line.trim()
    
    // Check if line is a bullet point
    if (trimmedLine.startsWith('* ')) {
      // Add to current list (remove the asterisk and space)
      currentList.push(trimmedLine.substring(2))
    } else {
      // If we were building a list, add it first
      addCurrentList()
      
      // Add regular line (if not empty)
      if (trimmedLine) {
        elements.push(
          <p key={`line-${elementIndex++}`} className="text-sm leading-relaxed mb-3 text-gray-200">
            {formatBoldText(trimmedLine)}
          </p>
        )
      }
    }
  })
  
  // Handle case where message ends with a list
  addCurrentList()
  
  return (
    <div>
      {elements}
    </div>
  )
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isUser,
  timestamp,
  isLoading = false,
  planReferences = []
}) => {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-8 px-4 group`}>
      <div className={`flex ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start space-x-3 max-w-3xl w-full animate-in slide-in-from-bottom-4 duration-500`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center shadow-xl border-2 transition-all duration-300 ${
          isUser 
            ? 'bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 border-blue-300/70 text-white shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105' 
            : 'bg-gradient-to-br from-yellow-400 to-yellow-600 border-yellow-300 text-black shadow-yellow-500/25 hover:shadow-yellow-500/40'
        }`}>
          {isUser ? (
            <div className="relative">
              <Icon name="user" size="md" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
            </div>
          ) : (
            <span className="text-lg font-bold">J</span>
          )}
        </div>

        {/* Message Content */}
        <div className={`flex-1 ${isUser ? 'mr-3' : 'ml-3'}`}>
          <div className={`rounded-2xl px-6 py-4 shadow-2xl border backdrop-blur-sm transition-all duration-300 hover:shadow-3xl ${
            isUser 
              ? 'bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 border-blue-400/30 text-white shadow-blue-900/30 hover:shadow-blue-900/50 relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/5 before:to-transparent before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700' 
              : 'bg-gradient-to-br from-gray-800 to-gray-900 border-yellow-500/30 text-gray-100 shadow-yellow-900/20'
          }`}>
            {isLoading ? (
              <div className="flex items-center space-x-4">
                <div className="typing-indicator">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
                <span className="text-sm text-yellow-400 font-medium animate-pulse">J.A.R.V.I.S is analyzing...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className={`leading-relaxed ${isUser ? 'font-medium' : ''}`}>
                  {isUser ? (
                    <div className="space-y-2">
                      <p className="text-white/95 text-base font-medium tracking-wide leading-relaxed">
                        {message}
                      </p>
                      <div className="flex items-center justify-end space-x-1 text-xs text-blue-200/70">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  ) : (
                    formatMessage(message)
                  )}
                </div>
                
                {/* Plan References */}
                {planReferences.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-yellow-500/20">
                    <p className="text-xs text-yellow-400 font-medium">REFERENCED PLANS:</p>
                    <div className="flex flex-wrap gap-2">
                      {planReferences.map((plan) => (
                        <Badge 
                          key={plan.id}
                          variant="default"
                          size="sm"
                          className={`${
                            isUser 
                              ? 'bg-blue-400/20 text-blue-100 border-blue-400/30' 
                              : 'bg-yellow-500/20 text-yellow-200 border-yellow-500/30'
                          }`}
                        >
                          {plan.type === 'daily' && '📅'} 
                          {plan.type === 'weekly' && '📊'} 
                          {plan.type === 'monthly' && '🎯'} 
                          {plan.title}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Timestamp */}
          <div className={`mt-3 text-xs font-medium transition-opacity duration-300 opacity-70 hover:opacity-100 ${isUser ? 'text-right text-blue-300' : 'text-left text-yellow-400'}`}>
            <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full backdrop-blur-sm ${
              isUser 
                ? 'bg-blue-400/10 text-blue-200' 
                : 'bg-yellow-400/10 text-yellow-300'
            }`}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                {timestamp.toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  timeZone: 'Asia/Phnom_Penh'
                })}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChatMessage 