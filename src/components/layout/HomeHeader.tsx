'use client'
import React from 'react'

interface HomeHeaderProps {
  currentTime: string;
  mounted: boolean;
}

export default function HomeHeader({ currentTime, mounted }: HomeHeaderProps) {
  return (
    <div className="text-center mb-12">
      <div className="flex justify-center mb-8">
        {/* Arc Reactor Style Icon */}
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-2xl border-4 border-yellow-300 animate-arc-reactor">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 flex items-center justify-center animate-inner-glow">
              <span className="text-black font-bold text-2xl animate-pulse">⚡</span>
            </div>
          </div>
          {/* Energy Rings */}
          <div className="absolute inset-0 rounded-full border-2 border-yellow-400 animate-energy-ring-1 opacity-60" />
          <div className="absolute inset-0 rounded-full border border-yellow-300 animate-energy-ring-2 opacity-40" />
          <div className="absolute inset-0 rounded-full border border-yellow-200 animate-energy-ring-3 opacity-20" />
        </div>
      </div>
      
      <h1 className="text-4xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 mb-4 animate-text-glow">
        Welcome back, Mr. Bunkheang 👋
      </h1>
      <p className="text-xl text-gray-300 font-medium mb-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        J.A.R.V.I.S Productivity System - Track your goals and achieve more
      </p>
      
      {/* HUD Style Time Display */}
      <div className="flex items-center justify-center space-x-4 text-gray-400 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
        <div className="bg-gray-800/50 border border-yellow-500/30 rounded-lg px-4 py-2 backdrop-blur-sm">
          <span className="text-base">
            {mounted ? new Date().toLocaleDateString('en-US', { 
              timeZone: 'Asia/Phnom_Penh',
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            }) : ''}
          </span>
        </div>
        <span className="w-2 h-2 bg-yellow-400 rounded-full animate-ping"></span>
        <div className="bg-gray-800/50 border border-yellow-500/30 rounded-lg px-4 py-2 backdrop-blur-sm">
          <span className="font-mono text-base text-yellow-400 animate-digital-clock">
            {mounted ? currentTime : '--:--:--'}
          </span>
        </div>
      </div>
    </div>
  );
} 