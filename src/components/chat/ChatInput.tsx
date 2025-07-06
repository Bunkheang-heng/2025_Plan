'use client'
import React, { useState, useRef, useEffect } from 'react'
import { Button, Icon } from '../index'
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition'

interface ChatInputProps {
  onSendMessage: (message: string) => void
  isLoading: boolean
  placeholder?: string
  lastResponse?: string
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
  placeholder = "Ask about your plans, progress, or get productivity tips...",
  lastResponse = ''
}) => {
  const [message, setMessage] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition()

  // Check for speech support on mount
  useEffect(() => {
    setSpeechSupported(browserSupportsSpeechRecognition && 'speechSynthesis' in window)
  }, [browserSupportsSpeechRecognition])

  // Update message when transcript changes
  useEffect(() => {
    if (transcript) {
      setMessage(transcript)
    }
  }, [transcript])

  // Update listening state
  useEffect(() => {
    setIsListening(listening)
  }, [listening])

  // Text-to-Speech function
  const speakResponse = (text: string) => {
    if ('speechSynthesis' in window && text) {
      // Stop any ongoing speech
      window.speechSynthesis.cancel()
      
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.9
      utterance.pitch = 1
      utterance.volume = 0.8
      
      // Try to use a male voice for J.A.R.V.I.S
      const voices = window.speechSynthesis.getVoices()
      const preferredVoice = voices.find(voice => 
        voice.name.toLowerCase().includes('male') || 
        voice.name.toLowerCase().includes('david') ||
        voice.name.toLowerCase().includes('alex')
      ) || voices[0]
      
      if (preferredVoice) {
        utterance.voice = preferredVoice
      }
      
      window.speechSynthesis.speak(utterance)
    }
  }

  // Auto-speak last response when it changes
  useEffect(() => {
    if (lastResponse && lastResponse.trim() && !isLoading) {
      // Wait a bit before speaking to avoid interrupting
      const timer = setTimeout(() => {
        speakResponse(lastResponse)
      }, 500)
      
      return () => clearTimeout(timer)
    }
  }, [lastResponse, isLoading])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && !isLoading) {
      onSendMessage(message.trim())
      setMessage('')
      resetTranscript()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const toggleListening = () => {
    if (listening) {
      SpeechRecognition.stopListening()
    } else {
      resetTranscript()
      setMessage('')
      SpeechRecognition.startListening({ 
        continuous: true,
        language: 'en-US' 
      })
    }
  }

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
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
    <div className="bg-gradient-to-r from-gray-900 to-black border-t border-yellow-500/30 p-6">
      <div className="max-w-5xl mx-auto">
        <form onSubmit={handleSubmit}>
          <div className="flex items-end space-x-4">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isListening ? "Listening... speak now" : placeholder}
                className={`w-full px-4 py-4 pr-12 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 text-gray-100 placeholder-gray-400 bg-gradient-to-br from-gray-800 to-gray-900 transition-all duration-200 resize-none min-h-[56px] max-h-[120px] shadow-lg ${
                  isListening 
                    ? 'border-green-500/50 ring-2 ring-green-500/30' 
                    : 'border-yellow-500/30'
                }`}
                rows={1}
                disabled={isLoading}
              />
              
              {/* Listening indicator */}
              {isListening && (
                <div className="absolute top-2 right-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-green-400 font-medium">Listening</span>
                  </div>
                </div>
              )}
              
              {/* Character count */}
              {!isListening && message.length > 0 && (
                <div className="absolute bottom-2 right-3 text-xs text-gray-500">
                  <span className={message.length > 500 ? 'text-orange-400' : 'text-yellow-400'}>
                    {message.length}/1000
                  </span>
                </div>
              )}
            </div>
            
            {/* Voice Controls */}
            <div className="flex items-center space-x-2">
              {speechSupported && (
                <>
                  <Button
                    type="button"
                    variant={isListening ? "danger" : "outline"}
                    size="lg"
                    onClick={toggleListening}
                    disabled={isLoading}
                    className={`px-4 py-4 transition-all duration-200 ${
                      isListening 
                        ? 'bg-red-500 hover:bg-red-600 text-white border-red-400/50' 
                        : 'border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isListening ? "M6 18L18 6M6 6l12 12" : "M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 016 0v6a3 3 0 01-3 3z"} />
                    </svg>
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={stopSpeaking}
                    className="px-4 py-4 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 transition-all duration-200"
                    title="Stop speaking"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                  </Button>
                </>
              )}
              
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={!message.trim() || isLoading}
                isLoading={isLoading}
                className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-semibold shadow-lg hover:shadow-xl transition-all duration-200 border border-yellow-400/50"
              >
                {isLoading ? (
                  <span>Processing...</span>
                ) : (
                  <>
                    <Icon name="send" size="md" className="mr-2" />
                    Send
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {/* Input hints */}
          <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center space-x-4">
              <span>Press Enter to send, Shift + Enter for new line</span>
              {speechSupported && (
                <span className="text-green-400">🎤 Voice commands enabled</span>
              )}
              {!speechSupported && (
                <span className="text-orange-400">Voice commands not supported in this browser</span>
              )}
            </div>
            <span className="hidden sm:block text-yellow-400">Powered by J.A.R.V.I.S AI</span>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ChatInput 