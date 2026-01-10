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
  messageTemplate?: string
  tradingReminderMinutes?: number
  classNotificationsEnabled?: boolean
  classReminderMinutes?: number
  assignmentNotificationsEnabled?: boolean
  assignmentReminderDays?: number[]
}

export default function NotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings>({ enabled: false })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [botUsername, setBotUsername] = useState<string>('')
  const [manualChatId, setManualChatId] = useState<string>('')
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [customMessage, setCustomMessage] = useState<string>('')
  const [nextReminderIn, setNextReminderIn] = useState<string>('')
  const [tradingReminderMinutes, setTradingReminderMinutes] = useState<number>(30)
  const [classReminderMinutes, setClassReminderMinutes] = useState<number>(15)
  const router = useRouter()

  useEffect(() => {
    // Countdown is based on server-stored lastReminder (set by cron).
    // If cron is delayed, the countdown will self-correct after the next run updates lastReminder.
    const tick = () => {
      if (!settings.enabled) {
        setNextReminderIn('')
        return
      }

      const last = settings.lastReminder ? Date.parse(settings.lastReminder) : NaN
      if (!Number.isFinite(last)) {
        setNextReminderIn('Waiting for first reminder...')
        return
      }

      const intervalMinutes = settings.tradingReminderMinutes || 30
      const next = last + intervalMinutes * 60 * 1000
      const diffMs = next - Date.now()

      if (diffMs <= 0) {
        setNextReminderIn('Sending soon...')
        return
      }

      const totalSeconds = Math.floor(diffMs / 1000)
      const minutes = Math.floor(totalSeconds / 60)
      const seconds = totalSeconds % 60
      setNextReminderIn(`${minutes}:${seconds.toString().padStart(2, '0')}`)
    }

    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [settings.enabled, settings.lastReminder])

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
          const data = settingsSnap.data() as NotificationSettings
          setSettings(data)
          if (typeof data.messageTemplate === 'string') {
            setCustomMessage(data.messageTemplate)
          }
          if (typeof data.tradingReminderMinutes === 'number') {
            setTradingReminderMinutes(data.tradingReminderMinutes)
          }
          if (typeof data.classReminderMinutes === 'number') {
            setClassReminderMinutes(data.classReminderMinutes)
          }
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

      // When enabling, send a reminder immediately. Only enable if the send succeeds.
      if (newEnabled) {
        const trimmed = customMessage.trim()
        const defaultText = `⏰ <b>Trading Discipline Reminder</b>

It’s time to stop trading for now. Step away from the charts and give your mind a reset.

Not every market movement is an opportunity. The best traders know when <b>not</b> to trade.

Protect your capital. Protect your mindset. Trust your plan.

<b>Discipline creates consistency.</b>  
<b>Patience is a position.</b> 📈
`
        const reminderText = trimmed || defaultText

        const res = await fetch('/api/telegram/send-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatId: settings.chatId,
            message: `✅ <b>Reminders enabled</b>\n\n${reminderText}`
          })
        })

        const data = await res.json().catch(() => null)
        if (!res.ok) {
          setMessage({
            type: 'error',
            text: data?.details || data?.error || 'Failed to send the first reminder. Please try again.'
          })
          return
        }

        const nowIso = new Date().toISOString()
        await setDoc(settingsRef, {
          enabled: true,
          chatId: settings.chatId || null,
          lastReminder: nowIso,
          updatedAt: nowIso
        }, { merge: true })

        setSettings(prev => ({ ...prev, enabled: true, lastReminder: nowIso }))
        setMessage({
          type: 'success',
          text: 'Notifications enabled and first reminder sent!'
        })
      } else {
        await setDoc(settingsRef, {
          enabled: false,
          chatId: settings.chatId || null,
          updatedAt: new Date().toISOString()
        }, { merge: true })

        setSettings(prev => ({ ...prev, enabled: false }))
        setMessage({
          type: 'success',
          text: 'Notifications disabled.'
        })
      }

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

  const handleSaveCustomMessage = async () => {
    const user = auth.currentUser
    if (!user) return

    const trimmed = customMessage.trim()
    if (trimmed.length > 3500) {
      setMessage({
        type: 'error',
        text: 'Message is too long. Please keep it under 3500 characters.'
      })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      const db = getFirestore()
      const settingsRef = doc(db, 'notificationSettings', user.uid)

      await setDoc(settingsRef, {
        messageTemplate: trimmed || null,
        updatedAt: new Date().toISOString()
      }, { merge: true })

      setSettings(prev => ({ ...prev, messageTemplate: trimmed || undefined }))
      setMessage({
        type: 'success',
        text: trimmed ? 'Custom reminder message saved!' : 'Custom message cleared. Default message will be used.'
      })
      setTimeout(() => setMessage(null), 5000)
    } catch (error) {
      console.error('Error saving custom message:', error)
      setMessage({
        type: 'error',
        text: 'Failed to save custom message. Please try again.'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSendTestReminder = async () => {
    const user = auth.currentUser
    if (!user) return

    if (!settings.chatId) {
      setMessage({
        type: 'error',
        text: 'No chat ID found yet. Please connect your Telegram bot first.'
      })
      return
    }

    setSaving(true)
    setMessage(null)

    const trimmed = customMessage.trim()
    const defaultText = `⏰ <b>Trading Reminder</b>\n\nTime to stop trading! Take a break and review your strategy.\n\nRemember: Discipline is key to successful trading.`
    const testText = trimmed || defaultText

    try {
      const res = await fetch('/api/telegram/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: settings.chatId,
          message: `🧪 <b>Test Reminder</b>\n\n${testText}`
        })
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setMessage({
          type: 'error',
          text: data?.details || data?.error || 'Failed to send test message.'
        })
        return
      }

      setMessage({
        type: 'success',
        text: 'Test reminder sent! Check your Telegram.'
      })
      setTimeout(() => setMessage(null), 6000)
    } catch (error) {
      console.error('Error sending test reminder:', error)
      setMessage({
        type: 'error',
        text: 'Failed to send test message. Please try again.'
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
            Get reminded to stop trading at your chosen interval
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
                      ? `You will receive reminders every ${settings.tradingReminderMinutes || 30} minutes` 
                      : 'Notifications are currently disabled'}
                  </p>
                  {settings.enabled && (
                    <p className="text-yellow-400 text-xs mt-1">
                      Next reminder: {nextReminderIn || '...'}
                    </p>
                  )}
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

            {/* Trading Reminder Interval */}
            <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-2">Reminder Interval</h3>
              <p className="text-gray-400 text-sm mb-4">
                Set how often you want to receive trading reminders (in minutes).
              </p>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  min="5"
                  max="240"
                  step="5"
                  value={tradingReminderMinutes}
                  onChange={(e) => setTradingReminderMinutes(Number(e.target.value))}
                  className="w-32 px-4 py-3 bg-gray-900/60 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-yellow-500"
                />
                <span className="text-gray-400 text-sm">minutes</span>
                <button
                  onClick={async () => {
                    const user = auth.currentUser
                    if (!user) return
                    if (tradingReminderMinutes < 5 || tradingReminderMinutes > 240) {
                      setMessage({ type: 'error', text: 'Interval must be between 5 and 240 minutes' })
                      setTimeout(() => setMessage(null), 5000)
                      return
                    }
                    setSaving(true)
                    try {
                      const db = getFirestore()
                      const settingsRef = doc(db, 'notificationSettings', user.uid)
                      await setDoc(settingsRef, {
                        tradingReminderMinutes,
                        updatedAt: new Date().toISOString()
                      }, { merge: true })
                      setSettings(prev => ({ ...prev, tradingReminderMinutes }))
                      setMessage({ type: 'success', text: 'Reminder interval saved!' })
                    } catch (error) {
                      setMessage({ type: 'error', text: 'Failed to save interval' })
                    } finally {
                      setSaving(false)
                      setTimeout(() => setMessage(null), 5000)
                    }
                  }}
                  disabled={saving}
                  className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold rounded-lg hover:from-yellow-400 hover:to-yellow-500 transition-all disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Interval'}
                </button>
              </div>
              <p className="text-gray-400 text-xs mt-2">
                You'll receive reminders every {tradingReminderMinutes} minutes when enabled. (Range: 5-240 minutes)
              </p>
            </div>

            {/* Custom Message */}
            <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-2">Custom Reminder Message</h3>
              <p className="text-gray-400 text-sm mb-4">
                This message will be sent every {settings.tradingReminderMinutes || 30} minutes when reminders are enabled. Leave empty to use the default message. Supports Telegram HTML (like <code className="bg-gray-700 px-2 py-0.5 rounded">&lt;b&gt;</code>).
              </p>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder={`⏰ <b>Trading Reminder</b>\n\nTime to stop trading! Take a break and review your strategy.\n\nRemember: Discipline is key to successful trading.`}
                className="w-full min-h-[140px] px-4 py-3 bg-gray-900/60 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-yellow-500"
              />
              <div className="mt-3 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleSaveCustomMessage}
                  disabled={saving}
                  className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold rounded-lg hover:from-yellow-400 hover:to-yellow-500 transition-all disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Message'}
                </button>
                <button
                  onClick={handleSendTestReminder}
                  disabled={saving || !settings.chatId}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-all disabled:opacity-50"
                >
                  {saving ? 'Sending...' : 'Send Test to Telegram'}
                </button>
              </div>
            </div>

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
                <li>Toggle notifications on to receive reminders at your chosen interval</li>
                <li>Optional: Customize the reminder message and send yourself a test</li>
              </ol>
            </div>
          </div>
        </div>

        {/* School Notifications */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-indigo-500/30 rounded-2xl overflow-hidden shadow-lg shadow-indigo-500/10 mb-6">
          <div className="bg-gradient-to-r from-indigo-500/20 to-indigo-600/20 border-b border-indigo-500/30 p-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              School Notifications
            </h2>
          </div>

          <div className="p-6 space-y-6">
            {/* Class Notifications Toggle */}
            <div className="flex items-center justify-between p-6 bg-gray-800/50 rounded-xl border border-gray-700">
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Class Reminders</h3>
                <p className="text-gray-400 text-sm">
                  Get notified before your classes start
                </p>
              </div>
              <button
                onClick={async () => {
                  const user = auth.currentUser
                  if (!user) return
                  const newValue = !(settings.classNotificationsEnabled !== false)
                  setSaving(true)
                  try {
                    const db = getFirestore()
                    const settingsRef = doc(db, 'notificationSettings', user.uid)
                    await setDoc(settingsRef, {
                      classNotificationsEnabled: newValue,
                      updatedAt: new Date().toISOString()
                    }, { merge: true })
                    setSettings(prev => ({ ...prev, classNotificationsEnabled: newValue }))
                    setMessage({
                      type: 'success',
                      text: newValue ? 'Class reminders enabled!' : 'Class reminders disabled.'
                    })
                  } catch (error) {
                    setMessage({ type: 'error', text: 'Failed to update settings' })
                  } finally {
                    setSaving(false)
                    setTimeout(() => setMessage(null), 5000)
                  }
                }}
                disabled={saving || !settings.chatId}
                className={`relative inline-flex h-12 w-24 items-center rounded-full transition-colors ${
                  settings.classNotificationsEnabled !== false
                    ? 'bg-indigo-500'
                    : 'bg-gray-700'
                } ${saving || !settings.chatId ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span
                  className={`inline-block h-10 w-10 transform rounded-full bg-white transition-transform ${
                    settings.classNotificationsEnabled !== false ? 'translate-x-12' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Class Reminder Minutes */}
            {settings.classNotificationsEnabled !== false && (
              <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-6">
                <label className="text-sm font-semibold text-white mb-2 block">
                  Remind me before class starts (minutes)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    min="5"
                    max="60"
                    step="5"
                    value={classReminderMinutes}
                    onChange={(e) => setClassReminderMinutes(Number(e.target.value))}
                    className="w-24 px-4 py-2 bg-gray-900/60 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={async () => {
                      const user = auth.currentUser
                      if (!user) return
                      setSaving(true)
                      try {
                        const db = getFirestore()
                        const settingsRef = doc(db, 'notificationSettings', user.uid)
                        await setDoc(settingsRef, {
                          classReminderMinutes,
                          updatedAt: new Date().toISOString()
                        }, { merge: true })
                        setSettings(prev => ({ ...prev, classReminderMinutes }))
                        setMessage({ type: 'success', text: 'Class reminder time saved!' })
                      } catch (error) {
                        setMessage({ type: 'error', text: 'Failed to save' })
                      } finally {
                        setSaving(false)
                        setTimeout(() => setMessage(null), 5000)
                      }
                    }}
                    disabled={saving}
                    className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-lg transition-all disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>
                <p className="text-gray-400 text-xs mt-2">
                  You'll receive a notification {classReminderMinutes} minutes before each class starts.
                </p>
              </div>
            )}

            {/* Assignment Notifications Toggle */}
            <div className="flex items-center justify-between p-6 bg-gray-800/50 rounded-xl border border-gray-700">
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Assignment Reminders</h3>
                <p className="text-gray-400 text-sm">
                  Get notified about upcoming assignment deadlines
                </p>
              </div>
              <button
                onClick={async () => {
                  const user = auth.currentUser
                  if (!user) return
                  const newValue = !(settings.assignmentNotificationsEnabled !== false)
                  setSaving(true)
                  try {
                    const db = getFirestore()
                    const settingsRef = doc(db, 'notificationSettings', user.uid)
                    await setDoc(settingsRef, {
                      assignmentNotificationsEnabled: newValue,
                      assignmentReminderDays: newValue ? [1, 0] : [], // 1 day before and on the day
                      updatedAt: new Date().toISOString()
                    }, { merge: true })
                    setSettings(prev => ({ ...prev, assignmentNotificationsEnabled: newValue }))
                    setMessage({
                      type: 'success',
                      text: newValue ? 'Assignment reminders enabled!' : 'Assignment reminders disabled.'
                    })
                  } catch (error) {
                    setMessage({ type: 'error', text: 'Failed to update settings' })
                  } finally {
                    setSaving(false)
                    setTimeout(() => setMessage(null), 5000)
                  }
                }}
                disabled={saving || !settings.chatId}
                className={`relative inline-flex h-12 w-24 items-center rounded-full transition-colors ${
                  settings.assignmentNotificationsEnabled !== false
                    ? 'bg-indigo-500'
                    : 'bg-gray-700'
                } ${saving || !settings.chatId ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span
                  className={`inline-block h-10 w-10 transform rounded-full bg-white transition-transform ${
                    settings.assignmentNotificationsEnabled !== false ? 'translate-x-12' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {settings.assignmentNotificationsEnabled !== false && (
              <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-4">
                <p className="text-gray-400 text-sm">
                  You'll receive notifications 1 day before assignments are due and on the due date.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-3">About This Feature</h3>
          <p className="text-gray-400 text-sm leading-relaxed mb-3">
            This notification system helps you maintain healthy trading habits by reminding you to take breaks. 
            The bot will send you reminders at your chosen interval when notifications are enabled. 
            You can customize the interval (5-240 minutes) and turn it on or off at any time from this page.
          </p>
          <p className="text-gray-400 text-sm leading-relaxed">
            <strong className="text-indigo-400">School Notifications:</strong> Get reminders for your classes and assignment deadlines. 
            Class reminders are sent before your scheduled classes, and assignment reminders notify you about upcoming deadlines.
          </p>
        </div>
      </div>
    </div>
  )
}

