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
          <div className="w-20 h-20 rounded-full bg-emerald-600 flex items-center justify-center shadow-md border-4 border-emerald-300 animate-arc-reactor">
            <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center animate-inner-glow">
              <span className="text-white font-bold text-2xl animate-pulse">⚡</span>
            </div>
          </div>
          {/* Energy Rings */}
          <div className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-energy-ring-1 opacity-60" />
          <div className="absolute inset-0 rounded-full border border-emerald-300 animate-energy-ring-2 opacity-40" />
          <div className="absolute inset-0 rounded-full border border-emerald-200 animate-energy-ring-3 opacity-20" />
        </div>
      </div>

      <h1 className="text-4xl lg:text-5xl font-bold text-emerald-600 mb-4 animate-text-glow">
        Welcome back, Mr. Bunkheang 👋
      </h1>
      <p className="text-xl text-stone-500 font-medium mb-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        Super Assistent Productivity System - Track your goals and achieve more
      </p>

      {/* HUD Style Time Display */}
      <div className="flex items-center justify-center space-x-4 text-stone-400 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
        <div className="bg-white border border-stone-200 rounded-lg px-4 py-2 backdrop-blur-sm">
          <span className="text-base text-stone-700">
            {mounted ? new Date().toLocaleDateString('en-US', {
              timeZone: 'Asia/Phnom_Penh',
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }) : ''}
          </span>
        </div>
        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping"></span>
        <div className="bg-white border border-stone-200 rounded-lg px-4 py-2 backdrop-blur-sm">
          <span className="font-mono text-base text-emerald-600 animate-digital-clock">
            {mounted ? currentTime : '--:--:--'}
          </span>
        </div>
      </div>
    </div>
  );
}
