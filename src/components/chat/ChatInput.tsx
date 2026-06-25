'use client'
import React, { useState, useRef, useEffect } from 'react'

interface ChatInputProps {
  onSendMessage: (message: string) => void
  isLoading: boolean
  placeholder?: string
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
  placeholder = "Ask about your plans, progress, or get productivity tips..."
}) => {
  const [message, setMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && !isLoading) {
      onSendMessage(message.trim())
      setMessage('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [message])

  return (
    <div className="p-6 relative">
      {/* Energy sweep effect */}
      <div className="absolute inset-0 bg-emerald-50 animate-energy-sweep pointer-events-none"></div>
      
      <div className="max-w-5xl mx-auto relative z-10">
        <form onSubmit={handleSubmit}>
          <div className="flex items-end space-x-3">
            <div className="flex-1 relative group">
              {/* Glow effect on focus */}
              <div className="absolute -inset-0.5 bg-emerald-50 rounded-2xl opacity-0 group-focus-within:opacity-100 blur transition duration-300"></div>
              
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="relative w-full px-5 py-4 pr-12 border-2 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-stone-900 placeholder-stone-400 bg-stone-100 backdrop-blur-sm transition-all duration-200 resize-none min-h-[60px] max-h-[120px] border-stone-200 hover:border-emerald-500/50"
                rows={1}
                disabled={isLoading}
              />
              
              {/* Character count */}
              {message.length > 0 && (
                <div className="absolute bottom-3 right-4 text-xs font-medium">
                  <span className={`px-2 py-1 rounded-full backdrop-blur-sm ${
                    message.length > 500 
                      ? 'bg-emerald-50 text-emerald-600 border border-stone-200' 
                      : 'bg-emerald-50 text-emerald-600 border border-stone-200'
                  }`}>
                    {message.length}/1000
                  </span>
                </div>
              )}
            </div>
            
            {/* Send Button */}
            <div className="flex items-center">
              <button
                type="submit"
                disabled={!message.trim() || isLoading}
                className={`group relative px-6 py-4 rounded-xl font-bold transition-all duration-300 hover:disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 overflow-hidden ${
                  !message.trim() || isLoading
                    ? 'bg-stone-200 text-stone-400 border-2 border-stone-200'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white border-2 border-stone-200'
                }`}
              >
                <span className="relative z-10 flex items-center space-x-2">
                  {isLoading ? (
                    <>
                      <svg className="animate-spin w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      <span>Send</span>
                    </>
                  )}
                </span>
              </button>
            </div>
          </div>
          
          {/* Input hints */}
          <div className="mt-4 flex items-center justify-between text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center space-x-1 text-stone-400">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Press <kbd className="px-1.5 py-0.5 bg-stone-100 border border-stone-200 rounded text-xs font-mono text-emerald-600">Enter</kbd> to send • <kbd className="px-1.5 py-0.5 bg-stone-100 border border-stone-200 rounded text-xs font-mono text-emerald-600">Shift + Enter</kbd> for new line</span>
              </span>
            </div>
            <span className="hidden sm:flex items-center space-x-1 text-emerald-600 font-medium">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
              <span>Powered by Super Assistent</span>
            </span>
          </div>
        </form>
      </div>

      <style jsx>{`
        @keyframes energy-sweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        .animate-energy-sweep {
          animation: energy-sweep 8s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}

export default ChatInput 