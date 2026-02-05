'use client'
import React, { useState, useEffect, memo } from 'react'
import dynamic from 'next/dynamic'

// Lazy load heavy animation components
const FloatingParticles = dynamic(() => import('./FloatingParticles'), { ssr: false })
const FloatingShapes = dynamic(() => import('./FloatingShapes'), { ssr: false })
const FloatingTechIcons = dynamic(() => import('./FloatingTechIcons'), { ssr: false })
const FloatingBinary = dynamic(() => import('./FloatingBinary'), { ssr: false })
const CircuitPattern = dynamic(() => import('./CircuitPattern'), { ssr: false })
const ScanningLines = dynamic(() => import('./ScanningLines'), { ssr: false })

function AnimatedBackground() {
  const [shouldAnimate, setShouldAnimate] = useState(false)
  const [isLowPower, setIsLowPower] = useState(false)

  useEffect(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    
    // Check for low-power mode or mobile devices
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    const hasLowMemory = (navigator as any).deviceMemory && (navigator as any).deviceMemory < 4
    
    setIsLowPower(isMobile || hasLowMemory || prefersReducedMotion)
    
    // Delay animation loading for better initial page load
    const timer = setTimeout(() => {
      setShouldAnimate(!prefersReducedMotion)
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  // Don't render anything if reduced motion is preferred
  if (!shouldAnimate) {
    return null
  }

  // Render minimal animations on low-power devices
  if (isLowPower) {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <CircuitPattern />
      </div>
    )
  }

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <CircuitPattern />
      <FloatingParticles count={10} />
      <FloatingShapes />
      <FloatingTechIcons />
      <FloatingBinary />
      <ScanningLines />
    </div>
  );
}

export default memo(AnimatedBackground) 