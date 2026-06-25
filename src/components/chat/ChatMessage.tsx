'use client'
import React from 'react'

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
        return <strong key={idx} className="font-bold text-emerald-600">{boldText}</strong>
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
        <ul key={`list-${elementIndex++}`} className="list-disc list-inside space-y-2 my-4 ml-4 text-stone-600">
          {currentList.map((item, i) => (
            <li key={i} className="text-sm leading-relaxed text-stone-600 marker:text-emerald-600">{formatBoldText(item.trim())}</li>
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
          <p key={`line-${elementIndex++}`} className="text-sm leading-relaxed mb-3 text-stone-600">
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
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex items-end gap-2.5 max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>

        {/* Avatar */}
        <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
          isUser ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-600 border border-stone-200'
        }`}>
          {isUser ? (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          )}
        </div>

        {/* Bubble */}
        <div className={`rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-emerald-600 text-white rounded-br-sm'
            : 'bg-white border border-stone-200 text-stone-900 rounded-bl-sm'
        }`}>
          {isLoading ? (
            <div className="flex items-center gap-2 py-0.5">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
              </div>
              <span className="text-xs text-stone-400">Thinking...</span>
            </div>
          ) : (
            <div>
              {isUser ? (
                <p className="text-sm leading-relaxed">{message}</p>
              ) : (
                formatMessage(message)
              )}

              {/* Plan References */}
              {planReferences.length > 0 && (
                <div className="mt-3 pt-3 border-t border-stone-100 flex flex-wrap gap-1.5">
                  {planReferences.map((plan) => (
                    <span
                      key={plan.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-xs font-medium"
                    >
                      {plan.type === 'daily' ? 'Daily' : plan.type === 'weekly' ? 'Weekly' : 'Monthly'} · {plan.title}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ChatMessage 