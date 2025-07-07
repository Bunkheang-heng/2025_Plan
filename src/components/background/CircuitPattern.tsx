'use client'
import React from 'react'

export default function CircuitPattern() {
  return (
    <div className="absolute inset-0 opacity-5">
      <svg className="w-full h-full" viewBox="0 0 1000 1000">
        <defs>
          <pattern id="circuit" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
            <path 
              d="M10,50 L90,50 M50,10 L50,90 M30,30 L70,30 M30,70 L70,70" 
              stroke="currentColor" 
              strokeWidth="1" 
              fill="none"
              className="text-yellow-400 animate-pulse" 
              style={{ animationDelay: '0s', animationDuration: '4s' }} 
            />
            <circle 
              cx="30" 
              cy="30" 
              r="2" 
              fill="currentColor" 
              className="text-yellow-400 animate-ping" 
              style={{ animationDelay: '1s' }} 
            />
            <circle 
              cx="70" 
              cy="70" 
              r="2" 
              fill="currentColor" 
              className="text-yellow-400 animate-ping" 
              style={{ animationDelay: '2s' }} 
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#circuit)" />
      </svg>
    </div>
  );
} 