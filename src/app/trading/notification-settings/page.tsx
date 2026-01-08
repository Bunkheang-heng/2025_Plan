'use client'
import React, { useState, useEffect } from 'react'
import { auth } from '../../../../firebase'
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import { Loading } from '@/components'
import { FaBell, FaBellSlash, FaTelegram, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa'

type NotificationSettings = {
  enabled: boolean
  chatId?: string
  lastReminder?: string
}

export default function NotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings>({ enabled: false })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [botUsername, setBotUsername] = useState<string>('')
  const [manualChatId, setManualChatId] = useState<string>('')
  const [showManualEntry, setShowManualEntry] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push('/login')
        return
      }

      try {
        const db = getFirestore()
        const settingsRef = doc(db, 'notificationSettings', user.uid)
        const settingsSnap = await getDoc(settingsRef)
        
        if (settingsSnap.exists()) {
          setSettings(settingsSnap.data() as NotificationSettings)
        }

        // Get bot username from API
        try {
          const response = await fetch('/api/telegram/bot-info')
          if (response.ok) {
            const data = await response.json()
            if (data.username) {
              setBotUsername(data.username)
            }
          }
        } catch (error) {
          console.error('Error fetching bot info:', error)
        }

        setLoading(false)
      } catch (error) {
        console.error('Error loading settings:', error)
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [router])

  const handleToggle = async () => {
    const user = auth.currentUser
    if (!user) return

    setSaving(true)
    setMessage(null)

    try {
      const db = getFirestore()
      const settingsRef = doc(db, 'notificationSettings', user.uid)
      const newEnabled = !settings.enabled

      // If enabling, check if chat ID exists
      if (newEnabled && !settings.chatId) {
        setMessage({
          type: 'error',
          text: 'Please start the Telegram bot first to get your chat ID. Click "Start Bot" below.'
        })
        setSaving(false)
        return
      }

      await setDoc(settingsRef, {
        enabled: newEnabled,
        chatId: settings.chatId || null,
        updatedAt: new Date().toISOString()
      }, { merge: true })

      setSettings(prev => ({ ...prev, enabled: newEnabled }))
      setMessage({
        type: 'success',
        text: newEnabled 
          ? 'Notifications enabled! You will receive reminders every 30 minutes.' 
          : 'Notifications disabled.'
      })

      // Clear message after 5 seconds
      setTimeout(() => setMessage(null), 5000)
    } catch (error) {
      console.error('Error updating settings:', error)
      setMessage({
        type: 'error',
        text: 'Failed to update settings. Please try again.'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleStartBot = async () => {
    const user = auth.currentUser
    if (!user) return

    if (botUsername) {
      // Create a start link with userId parameter
      const startLink = `https://t.me/${botUsername}?start=${user.uid}`
      window.open(startLink, '_blank')
      
      setMessage({
        type: 'success',
        text: 'Telegram opened! Please send /start to the bot. After sending, click "Refresh Connection" below to check if it worked.'
      })
      
      setTimeout(() => setMessage(null), 8000)
    } else {
      setMessage({
        type: 'error',
        text: 'Bot username not available. Please check your TELEGRAM_BOT_TOKEN in .env'
      })
    }
  }

  const handleRefreshConnection = async () => {
    const user = auth.currentUser
    if (!user) return

    setLoading(true)
    setMessage(null)

    try {
      const db = getFirestore()
      const settingsRef = doc(db, 'notificationSettings', user.uid)
      const settingsSnap = await getDoc(settingsRef)
      
      if (settingsSnap.exists()) {
        const data = settingsSnap.data() as NotificationSettings
        setSettings(data)
        
        if (data.chatId) {
          setMessage({
            type: 'success',
            text: 'Connection found! You can now enable notifications.'
          })
        } else {
          setMessage({
            type: 'error',
            text: 'No chat ID found. Please send /start to the bot first, or use manual entry below.'
          })
        }
      } else {
        setMessage({
          type: 'error',
          text: 'No connection found. Please send /start to the bot first.'
        })
      }
    } catch (error) {
      console.error('Error refreshing connection:', error)
      setMessage({
        type: 'error',
        text: 'Failed to refresh connection. Please try again.'
      })
    } finally {
      setLoading(false)
      setTimeout(() => setMessage(null), 5000)
    }
  }

  const handleManualRegister = async () => {
    const user = auth.currentUser
    if (!user) return

    if (!manualChatId.trim()) {
      setMessage({
        type: 'error',
        text: 'Please enter a valid chat ID'
      })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      const db = getFirestore()
      const settingsRef = doc(db, 'notificationSettings', user.uid)
      
      await setDoc(settingsRef, {
        chatId: manualChatId.trim(),
        updatedAt: new Date().toISOString()
      }, { merge: true })

      setSettings(prev => ({ ...prev, chatId: manualChatId.trim() }))
      setManualChatId('')
      setShowManualEntry(false)
      setMessage({
        type: 'success',
        text: 'Chat ID registered successfully! You can now enable notifications.'
      })

      // Test the connection by sending a test message
      try {
        const testResponse = await fetch('/api/telegram/send-message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chatId: manualChatId.trim(),
            message: '✅ Test message! Your trading reminder notifications are now connected.'
          }),
        })

        if (testResponse.ok) {
          setMessage({
            type: 'success',
            text: 'Chat ID registered and tested successfully! Check your Telegram for a test message.'
          })
        }
      } catch (error) {
        console.error('Error sending test message:', error)
        // Don't fail the registration if test fails
      }

      setTimeout(() => setMessage(null), 5000)
    } catch (error) {
      console.error('Error registering chat ID:', error)
      setMessage({
        type: 'error',
        text: 'Failed to register chat ID. Please try again.'
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <Loading />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-12 pt-28 lg:pt-32">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center px-4 py-2 bg-gray-800/50 border border-yellow-500/30 rounded-full text-yellow-400 text-sm font-semibold mb-6">
            <FaBell className="w-4 h-4 mr-2" />
            Trading Reminder Settings
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 mb-4">
            Telegram Notifications
          </h1>
          <p className="text-xl text-gray-300 font-medium">
            Get reminded to stop trading every 30 minutes
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500/30 rounded-2xl overflow-hidden shadow-lg shadow-yellow-500/10 mb-6">
          <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-b border-yellow-500/30 p-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <FaTelegram className="w-6 h-6 text-yellow-400" />
              Notification Status
            </h2>
          </div>

          <div className="p-6 space-y-6">
            {/* Toggle Section */}
            <div className="flex items-center justify-between p-6 bg-gray-800/50 rounded-xl border border-gray-700">
              <div className="flex items-center gap-4">
                {settings.enabled ? (
                  <FaBell className="w-8 h-8 text-yellow-400" />
                ) : (
                  <FaBellSlash className="w-8 h-8 text-gray-500" />
                )}
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">
                    Trading Reminders
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {settings.enabled 
                      ? 'You will receive reminders every 30 minutes' 
                      : 'Notifications are currently disabled'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleToggle}
                disabled={saving || (!settings.chatId && !settings.enabled)}
                className={`relative inline-flex h-14 w-28 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                  settings.enabled
                    ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                    : 'bg-gray-700'
                } ${saving || (!settings.chatId && !settings.enabled) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span
                  className={`inline-block h-12 w-12 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${
                    settings.enabled ? 'translate-x-14' : 'translate-x-2'
                  }`}
                />
              </button>
            </div>

            {/* Chat ID Status */}
            <div className={`p-6 rounded-xl border ${
              settings.chatId 
                ? 'bg-emerald-500/10 border-emerald-500/30' 
                : 'bg-red-500/10 border-red-500/30'
            }`}>
              <div className="flex items-center gap-3 mb-2">
                {settings.chatId ? (
                  <FaCheckCircle className="w-5 h-5 text-emerald-400" />
                ) : (
                  <FaExclamationCircle className="w-5 h-5 text-red-400" />
                )}
                <h3 className="text-lg font-bold text-white">
                  Telegram Connection
                </h3>
              </div>
              {settings.chatId ? (
                <div className="mt-2">
                  <p className="text-emerald-400 text-sm mb-2">
                    ✓ Connected to Telegram
                  </p>
                  <p className="text-gray-400 text-xs">
                    Chat ID: {settings.chatId}
                  </p>
                </div>
              ) : (
                <div className="mt-2 space-y-4">
                  <p className="text-red-400 text-sm mb-4">
                    ⚠ Not connected to Telegram bot
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleStartBot}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-lg hover:from-blue-400 hover:to-blue-500 transition-all flex items-center justify-center gap-2"
                    >
                      <FaTelegram className="w-5 h-5" />
                      Start Bot on Telegram
                    </button>
                    <button
                      onClick={handleRefreshConnection}
                      disabled={loading}
                      className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-all disabled:opacity-50"
                    >
                      {loading ? 'Checking...' : 'Refresh Connection'}
                    </button>
                  </div>
                  
                  <p className="text-gray-400 text-xs mt-2">
                    Click "Start Bot" to open Telegram, then send <code className="bg-gray-700 px-2 py-1 rounded">/start</code> to the bot. After that, click "Refresh Connection" to check if it worked.
                  </p>

                  {/* Manual Entry Option */}
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <button
                      onClick={() => setShowManualEntry(!showManualEntry)}
                      className="text-yellow-400 hover:text-yellow-300 text-sm font-semibold mb-3"
                    >
                      {showManualEntry ? 'Hide' : 'Show'} Manual Chat ID Entry
                    </button>
                    
                    {showManualEntry && (
                      <div className="space-y-3">
                        <p className="text-gray-400 text-xs">
                          If automatic registration doesn't work, you can manually enter your Telegram Chat ID. 
                          To find your Chat ID, message @userinfobot on Telegram.
                        </p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={manualChatId}
                            onChange={(e) => setManualChatId(e.target.value)}
                            placeholder="Enter your Telegram Chat ID"
                            className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-yellow-500"
                          />
                          <button
                            onClick={handleManualRegister}
                            disabled={saving || !manualChatId.trim()}
                            className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold rounded-lg hover:from-yellow-400 hover:to-yellow-500 transition-all disabled:opacity-50"
                          >
                            {saving ? 'Registering...' : 'Register'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Message Display */}
            {message && (
              <div className={`p-4 rounded-lg border ${
                message.type === 'success'
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                  : 'bg-red-500/20 border-red-500/50 text-red-400'
              }`}>
                {message.text}
              </div>
            )}

            {/* Instructions */}
            <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                How It Works
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-300 text-sm">
                <li>Start the Telegram bot by clicking "Start Bot on Telegram" above</li>
                <li>Send <code className="bg-gray-700 px-2 py-1 rounded">/start</code> to the bot</li>
                <li>Your chat ID will be automatically registered</li>
                <li>Toggle notifications on to receive reminders every 30 minutes</li>
                <li>You'll receive messages like: "⏰ Time to stop trading! Take a break."</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-3">About This Feature</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            This notification system helps you maintain healthy trading habits by reminding you to take breaks. 
            The bot will send you a reminder every 30 minutes when notifications are enabled. 
            You can turn it on or off at any time from this page.
          </p>
        </div>
      </div>
    </div>
  )
}

