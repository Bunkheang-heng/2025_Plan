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
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6 px-4 group`}>
      <div className={`flex ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start ${isUser ? 'space-x-reverse space-x-3' : 'space-x-3'} max-w-3xl w-full`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl border-2 transition-all duration-300 relative overflow-hidden ${
          isUser 
            ? 'bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 border-blue-300/70 text-white shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 hover:rotate-3' 
            : 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 border-yellow-300 text-black shadow-yellow-500/30 hover:shadow-yellow-500/50 hover:scale-105 hover:-rotate-3'
        }`}>
          {/* Shine effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
          
          {isUser ? (
            <div className="relative z-10">
              <Icon name="user" size="md" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
            </div>
          ) : (
            <div className="relative z-10">
              <span className="text-2xl font-black">J</span>
              {/* Arc reactor mini glow */}
              <div className="absolute inset-0 rounded-full bg-yellow-300 animate-pulse opacity-50 blur-sm"></div>
            </div>
          )}
        </div>

        {/* Message Content */}
        <div className={`flex-1 ${isUser ? '' : ''}`}>
          <div className={`relative rounded-2xl px-6 py-5 shadow-2xl border-2 backdrop-blur-sm transition-all duration-300 group-hover:scale-[1.01] ${
            isUser 
              ? 'bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 border-blue-400/40 text-white shadow-blue-900/40 hover:shadow-blue-900/60 overflow-hidden' 
              : 'bg-gradient-to-br from-gray-800/95 via-gray-850/95 to-gray-900/95 border-yellow-500/40 text-gray-100 shadow-yellow-900/30 hover:shadow-yellow-900/40 hover:border-yellow-500/60'
          }`}>
            {/* Animated gradient overlay for user messages */}
            {isUser && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            )}
            
            {/* Scan line effect for AI messages */}
            {!isUser && (
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-yellow-400/5 to-transparent h-full transform -translate-y-full group-hover:translate-y-full transition-transform duration-1000 ease-in-out"></div>
            )}
            {isLoading ? (
              <div className="flex items-center space-x-4 relative z-10">
                <div className="flex space-x-1.5">
                  <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                  <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
                <span className="text-sm text-yellow-400 font-semibold animate-pulse flex items-center space-x-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>J.A.R.V.I.S is analyzing...</span>
                </span>
              </div>
            ) : (
              <div className="space-y-4 relative z-10">
                <div className={`leading-relaxed ${isUser ? 'font-medium' : ''}`}>
                  {isUser ? (
                    <div className="space-y-3">
                      <p className="text-white text-base font-medium tracking-wide leading-relaxed">
                        {message}
                      </p>
                      <div className="flex items-center justify-end space-x-1 text-xs text-blue-100/80">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="ml-1 font-medium">Sent</span>
                      </div>
                    </div>
                  ) : (
                    formatMessage(message)
                  )}
                </div>
                
                {/* Plan References */}
                {planReferences.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-yellow-500/20">
                    <p className="text-xs text-yellow-400 font-bold flex items-center space-x-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>REFERENCED PLANS:</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {planReferences.map((plan) => (
                        <Badge 
                          key={plan.id}
                          variant="default"
                          size="sm"
                          className={`transition-all duration-200 hover:scale-105 cursor-pointer ${
                            isUser 
                              ? 'bg-blue-400/30 text-blue-100 border-blue-400/40 hover:bg-blue-400/40' 
                              : 'bg-yellow-500/30 text-yellow-100 border-yellow-500/40 hover:bg-yellow-500/40'
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
          <div className={`mt-3 text-xs font-medium transition-all duration-300 opacity-60 group-hover:opacity-100 ${isUser ? 'text-right text-blue-300' : 'text-left text-yellow-400'}`}>
            <span className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full backdrop-blur-sm border transition-all duration-200 ${
              isUser 
                ? 'bg-blue-400/15 text-blue-100 border-blue-400/20 group-hover:bg-blue-400/25 group-hover:border-blue-400/30' 
                : 'bg-yellow-400/15 text-yellow-200 border-yellow-400/20 group-hover:bg-yellow-400/25 group-hover:border-yellow-400/30'
            }`}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-semibold">
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