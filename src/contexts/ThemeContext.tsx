'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'

type Theme = 'dark' | 'light'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},
})

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: React.ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    setMounted(true)
    
    const stored = localStorage.getItem('theme') as Theme | null
    if (stored === 'light' || stored === 'dark') {
      setThemeState(stored)
      document.documentElement.setAttribute('data-theme', stored)
      document.documentElement.classList.toggle('dark', stored === 'dark')
      return
    }

    // Check system preference
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches
    const systemTheme: Theme = prefersLight ? 'light' : 'dark'
    setThemeState(systemTheme)
    document.documentElement.setAttribute('data-theme', systemTheme)
    document.documentElement.classList.toggle('dark', systemTheme === 'dark')
  }, [])

  // Apply theme changes
  useEffect(() => {
    if (!mounted) return
    
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme, mounted])

  const toggleTheme = useCallback(() => {
    setThemeState(prev => prev === 'dark' ? 'light' : 'dark')
  }, [])

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
  }, [])

  const value = useMemo(() => ({
    theme,
    toggleTheme,
    setTheme,
  }), [theme, toggleTheme, setTheme])

  // Prevent flash of wrong theme
  if (!mounted) {
    return null
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export default ThemeContext
